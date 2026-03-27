import { prisma } from '../config/prisma'

export async function listBudgets(userId: string) {
  return prisma.budget.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  })
}

export async function upsertBudget(
  userId: string,
  data: { categoryId: string | null; name: string; amount: number },
) {
  // If categoryId is null this is the "overall" monthly budget (no category)
  const existing = await prisma.budget.findFirst({
    where: { userId, categoryId: data.categoryId ?? null },
  })

  if (existing) {
    return prisma.budget.update({
      where: { id: existing.id },
      data: { name: data.name, amount: data.amount },
      include: { category: true },
    })
  }

  return prisma.budget.create({
    data: {
      userId,
      categoryId: data.categoryId ?? null,
      name: data.name,
      amount: data.amount,
    },
    include: { category: true },
  })
}

export async function deleteBudget(userId: string, budgetId: string) {
  const budget = await prisma.budget.findFirst({ where: { id: budgetId, userId } })
  if (!budget) return null
  return prisma.budget.delete({ where: { id: budgetId } })
}

/** Returns each budget with how much has been spent this month */
export async function getBudgetProgress(userId: string, month?: string) {
  let dateFrom: Date
  let dateTo: Date

  if (month) {
    const [year, m] = month.split('-').map(Number)
    dateFrom = new Date(year, m - 1, 1)
    dateTo = new Date(year, m, 0, 23, 59, 59, 999)
  } else {
    const now = new Date()
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  }

  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  })

  // Get all expense transactions in the month per category
  const spending = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      deletedAt: null,
      isDuplicate: false,
      type: 'EXPENSE',
      date: { gte: dateFrom, lte: dateTo },
    },
    _sum: { amount: true },
  })

  const spendMap = new Map(spending.map((s) => [s.categoryId ?? '__null__', s._sum.amount ?? 0]))
  const totalSpent = spending.reduce((acc, s) => acc + (s._sum.amount ?? 0), 0)

  return budgets.map((b) => {
    const spent = b.categoryId
      ? (spendMap.get(b.categoryId) ?? 0)
      : totalSpent  // null categoryId = overall budget

    const percent = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0

    return {
      id: b.id,
      name: b.name,
      amount: b.amount,
      categoryId: b.categoryId,
      category: b.category,
      spent: Math.round(spent * 100) / 100,
      remaining: Math.max(0, Math.round((b.amount - spent) * 100) / 100),
      percent,
      exceeded: spent > b.amount,
    }
  })
}
