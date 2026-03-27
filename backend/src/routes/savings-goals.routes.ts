import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import {
  listSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from '../services/savings-goals.service'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const goals = await listSavingsGoals(req.user!.id)
  res.json(goals)
})

router.post('/', async (req, res) => {
  const { name, emoji, color, targetAmount, currentAmount, currency, deadline } = req.body
  if (!name || !targetAmount) {
    res.status(400).json({ error: 'name y targetAmount son requeridos' })
    return
  }
  const goal = await createSavingsGoal(req.user!.id, {
    name, emoji, color, targetAmount, currentAmount, currency, deadline,
  })
  res.status(201).json(goal)
})

router.patch('/:id', async (req, res) => {
  const goal = await updateSavingsGoal(req.user!.id, req.params.id, req.body)
  if (!goal) {
    res.status(404).json({ error: 'Meta no encontrada' })
    return
  }
  res.json(goal)
})

router.delete('/:id', async (req, res) => {
  const goal = await deleteSavingsGoal(req.user!.id, req.params.id)
  if (!goal) {
    res.status(404).json({ error: 'Meta no encontrada' })
    return
  }
  res.json({ ok: true })
})

export default router
