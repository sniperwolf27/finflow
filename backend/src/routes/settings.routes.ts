import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import {
  getSettings,
  updateCurrency,
  getExchangeRates,
  syncExchangeRates,
  setManualRate
} from '../controllers/settings.controller'

const router = Router()

// Proteger todas las rutas de settings
router.use(requireAuth)

// Rutas directas de configuración
router.get('/', getSettings)
router.patch('/currency', updateCurrency)

// Rutas de manejo de Exchange Rates
router.get('/exchange-rates', getExchangeRates)
router.post('/exchange-rates/sync', syncExchangeRates)
router.post('/exchange-rates/manual', setManualRate)

export default router
