import { Request, Response } from 'express'
import * as analyticsService from '../services/analytics.service'

/**
 * Validar y parsear el parámetro 'months' (1 a 24).
 */
const parseMonths = (val: any, defaultVal: number): number | null => {
  if (val === undefined || val === null) return defaultVal
  const num = parseInt(val as string, 10)
  if (isNaN(num) || num < 1 || num > 24) return null
  return num
}

/**
 * Validar y parsear el parámetro 'limit' para top listados (1 a 50).
 */
const parseLimit = (val: any, defaultVal: number): number | null => {
  if (val === undefined || val === null) return defaultVal
  const num = parseInt(val as string, 10)
  if (isNaN(num) || num < 1 || num > 50) return null
  return num
}

export const getCategoryTrends = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const months = parseMonths(req.query.months, 6)

    if (months === null) {
      return res.status(400).json({ error: 'El parámetro "months" debe ser un número entre 1 y 24' })
    }

    const data = await analyticsService.getCategoryTrends(userId, months)
    res.json(data)
  } catch (error) {
    console.error('Error in getCategoryTrends:', error)
    res.status(500).json({ error: 'Error al obtener tendencias de categorías' })
  }
}

export const getSavingsTrend = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const months = parseMonths(req.query.months, 12)

    if (months === null) {
      return res.status(400).json({ error: 'El parámetro "months" debe ser un número entre 1 y 24' })
    }

    const data = await analyticsService.getSavingsTrend(userId, months)
    res.json(data)
  } catch (error) {
    console.error('Error in getSavingsTrend:', error)
    res.status(500).json({ error: 'Error al obtener tendencia de ahorro' })
  }
}

export const getSpendingHeatmap = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const months = parseMonths(req.query.months, 3)

    if (months === null) {
      return res.status(400).json({ error: 'El parámetro "months" debe ser un número entre 1 y 24' })
    }

    const data = await analyticsService.getSpendingHeatmap(userId, months)
    res.json(data)
  } catch (error) {
    console.error('Error in getSpendingHeatmap:', error)
    res.status(500).json({ error: 'Error al obtener el mapa de calor de gastos' })
  }
}

export const getYoYComparison = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    
    // Este endpoint compara Año Actual vs Anterior, 'months' no es estrictamente necesario, 
    // pero mantenemos la firma del servicio que no lo requiere.
    const data = await analyticsService.getYoYComparison(userId)
    res.json(data)
  } catch (error) {
    console.error('Error in getYoYComparison:', error)
    res.status(500).json({ error: 'Error al obtener la comparativa año contra año' })
  }
}

export const getTopMerchants = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const months = parseMonths(req.query.months, 3)
    const limit = parseLimit(req.query.limit, 10)

    if (months === null) {
      return res.status(400).json({ error: 'El parámetro "months" debe ser un número entre 1 y 24' })
    }

    if (limit === null) {
      return res.status(400).json({ error: 'El parámetro "limit" debe ser un número entre 1 y 50' })
    }

    const data = await analyticsService.getTopMerchants(userId, months, limit)
    res.json(data)
  } catch (error) {
    console.error('Error in getTopMerchants:', error)
    res.status(500).json({ error: 'Error al obtener los top comercios' })
  }
}
