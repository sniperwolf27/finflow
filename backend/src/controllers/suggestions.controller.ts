import { Request, Response, NextFunction } from 'express'
import * as suggestionsService from '../services/suggestions.service'

export async function getActiveSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const suggestions = await suggestionsService.getActiveSuggestions(req.user!.id)
    res.json(suggestions)
  } catch (err) {
    next(err)
  }
}

export async function generateSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log(`[POST /api/suggestions/generate] Iniciando análisis para userId: ${req.user!.id}`)
    const suggestions = await suggestionsService.generateSuggestions(req.user!.id)
    console.log(`[POST /api/suggestions/generate] Generación exitosa. Sugerencias activas: ${suggestions.length}`)
    res.json(suggestions)
  } catch (err: any) {
    console.error(`[POST /api/suggestions/generate] Error:`, err.message, err.stack)
    next(err)
  }
}

export async function acceptSuggestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { targetAmount, months } = req.body
    const goal = await suggestionsService.acceptSuggestion(req.user!.id, id, { targetAmount, months })
    res.json(goal)
  } catch (err) {
    next(err)
  }
}

export async function dismissSuggestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const suggestion = await suggestionsService.dismissSuggestion(req.user!.id, id)
    res.json(suggestion)
  } catch (err) {
    next(err)
  }
}
