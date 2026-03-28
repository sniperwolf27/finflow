import { Router } from 'express'
import * as suggestionsCtrl from '../controllers/suggestions.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()
router.use(requireAuth)

router.get('/', suggestionsCtrl.getActiveSuggestions)
router.post('/generate', suggestionsCtrl.generateSuggestions)
router.post('/:id/accept', suggestionsCtrl.acceptSuggestion)
router.post('/:id/dismiss', suggestionsCtrl.dismissSuggestion)

export default router
