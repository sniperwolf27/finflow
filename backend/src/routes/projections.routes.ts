import { Router } from 'express'
import * as projectionsController from '../controllers/projections.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

// Requiere autenticación para todas las rutas de proyecciones
router.use(requireAuth)

router.get('/savings', projectionsController.getSavingsProjection)
router.post('/next-month-plan', projectionsController.generateNextMonthPlan)
router.get('/recurring-expenses', projectionsController.getRecurringExpenses)
router.post('/monthly-plan', projectionsController.upsertMonthlyPlan)
router.get('/monthly-plan/:month', projectionsController.getMonthlyPlan)

export default router
