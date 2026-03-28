import { Router } from 'express'
import * as analyticsController from '../controllers/analytics.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

// Se aplica el middleware a nivel del router (este es el "patrón existente"
// tal como se hace en dashboard.routes.ts, budgets.routes.ts, etc.)
router.use(requireAuth)

router.get('/category-trends', analyticsController.getCategoryTrends)
router.get('/savings-trend', analyticsController.getSavingsTrend)
router.get('/spending-heatmap', analyticsController.getSpendingHeatmap)
router.get('/yoy-comparison', analyticsController.getYoYComparison)
router.get('/top-merchants', analyticsController.getTopMerchants)

export default router
