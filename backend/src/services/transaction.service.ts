import { Prisma, TransactionSource, TransactionType } from '@prisma/client'
import { prisma } from '../config/prisma'
import { buildContentHash } from '../utils/hash'
import { toDateString } from '../utils/date'
import { ExtractedTransaction, categorizeTransactionsBatch, CATEGORY_NAMES, CategoryName } from './claude.service'
import { RawEmail } from './gmail.service'

/** Colors and icons that match the default seed for each predefined category name. */
const CATEGORY_DEFAULTS: Record<CategoryName, { color: string; icon: string }> = {
  'Food & Dining': { color: '#f97316', icon: 'utensils' },
  'Transport':     { color: '#3b82f6', icon: 'car' },
  'Shopping':      { color: '#ec4899', icon: 'shopping-bag' },
  'Utilities':     { color: '#8b5cf6', icon: 'zap' },
  'Entertainment': { color: '#f59e0b', icon: 'tv' },
  'Health':        { color: '#10b981', icon: 'heart' },
  'Travel':        { color: '#06b6d4', icon: 'plane' },
  'Subscriptions': { color: '#6366f1', icon: 'repeat' },
  'Income':        { color: '#22c55e', icon: 'trending-up' },
  'Other':         { color: '#94a3b8', icon: 'tag' },
}

/**
 * Find a category by name (user-owned or system default).
 * If it doesn't exist, create it as a system-level default so all users can see it.
 */
async function findOrCreateCategory(name: string, userId: string) {
  const existing = await prisma.category.findFirst({
    where: { name, OR: [{ userId }, { userId: null }] },
  })
  if (existing) return existing

  const defaults = CATEGORY_DEFAULTS[name as CategoryName]
  return prisma.category.create({
    data: {
      name,
      color: defaults?.color ?? '#94a3b8',
      icon:  defaults?.icon  ?? 'tag',
      isDefault: CATEGORY_NAMES.includes(name as CategoryName),
      userId: null, // system-level so all users benefit
    },
  })
}

export interface TransactionFilters {
  userId: string
  search?: string
  categoryId?: string
  type?: TransactionType
  dateFrom?: Date
  dateTo?: Date
  source?: TransactionSource
  isConfirmed?: boolean
  page?: number
  limit?: number
}

export async function createFromEmail(
  userId: string,
  extracted: ExtractedTransaction,
  email: RawEmail
): Promise<{ created: boolean; duplicate: boolean }> {
  if (!extracted.found || !extracted.amount || !extracted.date) {
    return { created: false, duplicate: false }
  }

  const dateStr = extracted.date.split('T')[0]
  const merchant = extracted.merchant || extracted.description || 'Unknown'
  const contentHash = buildContentHash(userId, extracted.amount, dateStr, merchant)

  // Find or create category
  const category = extracted.category
    ? await findOrCreateCategory(extracted.category, userId)
    : null

  try {
    await prisma.transaction.create({
      data: {
        userId,
        amount: extracted.amount,
        currency: extracted.currency || 'USD',
        type: (extracted.type as TransactionType) || 'EXPENSE',
        date: new Date(extracted.date),
        description: extracted.description || email.subject.slice(0, 100),
        merchant: extracted.merchant || null,
        categoryId: category?.id || null,
        aiCategory: extracted.category || null,
        isConfirmed: false,
        source: TransactionSource.GMAIL,
        gmailMessageId: email.messageId,
        gmailThreadId: email.threadId,
        contentHash,
        rawEmailSnippet: email.snippet.slice(0, 500),
        aiConfidence: extracted.confidence || null,
        aiRawResponse: JSON.stringify(extracted),
      },
    })
    return { created: true, duplicate: false }
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return { created: false, duplicate: true }
    }
    throw err
  }
}

export async function listTransactions(filters: TransactionFilters) {
  const {
    userId, search, categoryId, type, dateFrom, dateTo,
    source, isConfirmed, page = 1, limit = 50,
  } = filters

  const where: Prisma.TransactionWhereInput = {
    userId,
    deletedAt: null,
    isDuplicate: false,
    ...(search && {
      OR: [
        { description: { contains: search } },
        { merchant: { contains: search } },
        { notes: { contains: search } },
      ],
    }),
    ...(categoryId && { categoryId }),
    ...(type && { type }),
    // IMPORTANTE: nunca hacer spread separado de dos objetos con key 'date'.
    // JavaScript sobreescribiría el primero. Siempre mergeamos en un solo objeto.
    ...((dateFrom || dateTo) && {
      date: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo   && { lte: dateTo }),
      },
    }),
    ...(source && { source }),
    ...(isConfirmed !== undefined && { isConfirmed }),
  }

  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return { total, page, limit, items }
}

export async function updateTransaction(
  id: string,
  userId: string,
  data: Partial<{
    amount: number
    type: TransactionType
    date: Date
    description: string
    merchant: string
    notes: string
    categoryId: string
    isConfirmed: boolean
  }>
) {
  return prisma.transaction.update({
    where: { id, userId },
    data: { ...data, updatedAt: new Date() },
    include: { category: true },
  })
}

export async function softDeleteTransaction(id: string, userId: string) {
  return prisma.transaction.update({
    where: { id, userId },
    data: { deletedAt: new Date() },
  })
}

export async function confirmTransaction(id: string, userId: string) {
  return prisma.transaction.update({
    where: { id, userId },
    data: { isConfirmed: true },
    include: { category: true },
  })
}

export async function createManualTransaction(
  userId: string,
  data: {
    amount: number
    currency: string
    type: TransactionType
    date: Date
    description: string
    merchant?: string
    notes?: string
    categoryId?: string
  }
) {
  const dateStr = toDateString(data.date)
  const merchant = data.merchant || data.description
  const contentHash = buildContentHash(userId, data.amount, dateStr, merchant)

  return prisma.transaction.create({
    data: {
      ...data,
      userId,
      source: TransactionSource.MANUAL,
      contentHash,
      isConfirmed: true,
    },
    include: { category: true },
  })
}

export async function categorizeUncategorized(userId: string): Promise<number> {
  const uncategorized = await prisma.transaction.findMany({
    where: { userId, categoryId: null, deletedAt: null },
    take: 25,
    orderBy: { date: 'desc' },
    select: { id: true, description: true, merchant: true },
  })

  if (uncategorized.length === 0) return 0

  console.log(`[Categorize] Found ${uncategorized.length} uncategorized transaction(s) for user ${userId}`)

  // Single API call for all transactions
  const categoryMap = await categorizeTransactionsBatch(uncategorized)

  let count = 0
  for (const [txId, categoryName] of Object.entries(categoryMap)) {
    const category = await findOrCreateCategory(categoryName, userId)
    await prisma.transaction.update({
      where: { id: txId },
      data: { categoryId: category.id, aiCategory: categoryName },
    })
    count++
  }

  console.log(`[Categorize] Categorized ${count} transaction(s) for user ${userId}`)
  return count
}

export async function exportTransactions(filters: Omit<TransactionFilters, 'page' | 'limit'>) {
  const where: Prisma.TransactionWhereInput = {
    userId: filters.userId,
    deletedAt: null,
    isDuplicate: false,
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...(filters.type && { type: filters.type }),
    ...((filters.dateFrom || filters.dateTo) && {
      date: {
        ...(filters.dateFrom && { gte: filters.dateFrom }),
        ...(filters.dateTo   && { lte: filters.dateTo }),
      },
    }),
  }

  return prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: 'desc' },
  })
}
