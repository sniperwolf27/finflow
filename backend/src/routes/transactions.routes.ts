import { Router } from 'express'
import { TransactionSource, TransactionType } from '@prisma/client'
import { requireAuth } from '../middleware/auth.middleware'
import {
  listTransactions,
  updateTransaction,
  softDeleteTransaction,
  confirmTransaction,
  createManualTransaction,
  exportTransactions,
  bulkUpdateCurrency,
} from '../services/transaction.service'
import { parseTransactionFromText } from '../services/claude.service'
import { prisma } from '../config/prisma'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const { search, categoryId, type, dateFrom, dateTo, source, isConfirmed, page, limit } = req.query

    const result = await listTransactions({
      userId: req.user!.id,
      search: search as string,
      categoryId: categoryId as string,
      type: type as TransactionType,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      source: source as TransactionSource,
      isConfirmed: isConfirmed !== undefined ? isConfirmed === 'true' : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 50,
    })

    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/ai-parse', async (req, res, next) => {
  try {
    const { text } = req.body as { text?: string }
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'text is required' })
      return
    }
    const currentDate = new Date().toISOString().split('T')[0]
    const result = await parseTransactionFromText(text.trim(), currentDate)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get('/export', async (req, res, next) => {
  try {
    const { categoryId, type, dateFrom, dateTo, source } = req.query

    const transactions = await exportTransactions({
      userId: req.user!.id,
      categoryId: categoryId as string,
      type: type as TransactionType,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      source: source as TransactionSource,
    })

    const headers = ['Date', 'Description', 'Merchant', 'Type', 'Category', 'Amount', 'Currency', 'Source', 'Confirmed']
    const rows = transactions.map((t) => [
      t.date.toISOString().split('T')[0],
      `"${t.description.replace(/"/g, '""')}"`,
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      t.type,
      `"${t.category?.name || ''}"`,
      t.amount,
      t.currency,
      t.source,
      t.isConfirmed,
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="finflow-transactions.csv"')
    res.send(csv)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const tx = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
      include: { category: true },
    })
    if (!tx) { res.status(404).json({ error: 'Not found' }); return }
    res.json(tx)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { amount, originalAmount, currency, type, date, description, merchant, notes, categoryId } = req.body
    const tx = await createManualTransaction(req.user!.id, {
      amount: Number(amount),
      originalAmount: originalAmount ? Number(originalAmount) : Number(amount),
      currency: currency || 'DOP',
      type,
      date: new Date(date),
      description,
      merchant,
      notes,
      categoryId,
    })
    res.status(201).json(tx)
  } catch (err) {
    next(err)
  }
})

router.patch('/bulk-currency', async (req, res, next) => {
  try {
    const { transactionIds, currency } = req.body as { transactionIds: string[], currency: string }
    if (!transactionIds?.length || !currency) {
      res.status(400).json({ error: 'transactionIds y currency son requeridos' })
      return
    }
    const count = await bulkUpdateCurrency(req.user!.id, transactionIds, currency)
    res.json({ ok: true, count })
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const { amount, originalAmount, currency, type, date, description, merchant, notes, categoryId, isConfirmed } = req.body
    const tx = await updateTransaction(req.params.id, req.user!.id, {
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(originalAmount !== undefined && { originalAmount: Number(originalAmount) }),
      ...(currency !== undefined && { currency }),
      ...(type && { type }),
      ...(date && { date: new Date(date) }),
      ...(description !== undefined && { description }),
      ...(merchant !== undefined && { merchant }),
      ...(notes !== undefined && { notes }),
      ...(categoryId !== undefined && { categoryId }),
      ...(isConfirmed !== undefined && { isConfirmed }),
    })
    res.json(tx)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await softDeleteTransaction(req.params.id, req.user!.id)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/confirm', async (req, res, next) => {
  try {
    const tx = await confirmTransaction(req.params.id, req.user!.id)
    res.json(tx)
  } catch (err) {
    next(err)
  }
})

router.post('/bulk-confirm', async (req, res, next) => {
  try {
    const { ids } = req.body as { ids: string[] }
    await prisma.transaction.updateMany({
      where: { id: { in: ids }, userId: req.user!.id },
      data: { isConfirmed: true },
    })
    res.json({ ok: true, count: ids.length })
  } catch (err) {
    next(err)
  }
})

export default router
