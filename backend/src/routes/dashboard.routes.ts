import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import {
  getSummary,
  getByCategory,
  getMonthlyEvolution,
  getCashFlow,
  getTopMerchants,
  getDailyEvolution,
} from '../services/dashboard.service'

const router = Router()
router.use(requireAuth)

router.get('/summary', async (req, res) => {
  const data = await getSummary(req.user!.id, req.query.month as string)
  res.json(data)
})

router.get('/by-category', async (req, res) => {
  const { dateFrom, dateTo } = req.query
  const data = await getByCategory(
    req.user!.id,
    dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo ? new Date(dateTo as string) : undefined
  )
  res.json(data)
})

router.get('/monthly-evolution', async (req, res) => {
  const months = req.query.months ? Number(req.query.months) : 12
  const data = await getMonthlyEvolution(req.user!.id, months)
  res.json(data)
})

router.get('/cash-flow', async (req, res) => {
  const weeks = req.query.weeks ? Number(req.query.weeks) : 8
  const data = await getCashFlow(req.user!.id, weeks)
  res.json(data)
})

router.get('/daily-evolution', async (req, res) => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7)
  const data = await getDailyEvolution(req.user!.id, month)
  res.json(data)
})

router.get('/top-merchants', async (req, res) => {
  const data = await getTopMerchants(req.user!.id)
  res.json(data)
})

export default router
