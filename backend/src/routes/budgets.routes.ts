import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import {
  listBudgets,
  upsertBudget,
  deleteBudget,
  getBudgetProgress,
} from '../services/budgets.service'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const budgets = await listBudgets(req.user!.id)
  res.json(budgets)
})

router.get('/progress', async (req, res) => {
  const data = await getBudgetProgress(req.user!.id, req.query.month as string)
  res.json(data)
})

router.put('/', async (req, res) => {
  const { categoryId, name, amount } = req.body
  if (!name || amount === undefined) {
    res.status(400).json({ error: 'name y amount son requeridos' })
    return
  }
  const budget = await upsertBudget(req.user!.id, {
    categoryId: categoryId ?? null,
    name,
    amount: Number(amount),
  })
  res.json(budget)
})

router.delete('/:id', async (req, res) => {
  const budget = await deleteBudget(req.user!.id, req.params.id)
  if (!budget) {
    res.status(404).json({ error: 'Presupuesto no encontrado' })
    return
  }
  res.json({ ok: true })
})

export default router
