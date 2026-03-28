import { Request, Response } from 'express'
import * as projectionsService from '../services/projections.service'

export const getSavingsProjection = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const data = await projectionsService.getSavingsProjection(userId)
    res.json(data)
  } catch (error) {
    console.error('Error in getSavingsProjection:', error)
    res.status(500).json({ error: 'Error al obtener proyecciones de ahorro' })
  }
}

export const generateNextMonthPlan = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { expectedIncome, fixedExpenses, savingsGoal, months } = req.body

    if (expectedIncome <= 0 || typeof expectedIncome !== 'number') {
      return res.status(400).json({ error: 'expectedIncome debe ser un número mayor a 0' })
    }

    if (!Array.isArray(fixedExpenses)) {
      return res.status(400).json({ error: 'fixedExpenses debe ser un arreglo' })
    }

    const data = await projectionsService.generateNextMonthPlan(userId, {
      expectedIncome,
      fixedExpenses,
      savingsGoal,
      months: months || 1
    })
    res.json(data)
  } catch (error) {
    console.error('Error in generateNextMonthPlan:', error)
    res.status(500).json({ error: 'Error al generar el plan del próximo mes' })
  }
}

export const getRecurringExpenses = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const data = await projectionsService.getRecurringExpenses(userId)
    res.json(data)
  } catch (error) {
    console.error('Error in getRecurringExpenses:', error)
    res.status(500).json({ error: 'Error al obtener gastos recurrentes' })
  }
}

export const getMonthlyPlan = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { month } = req.params

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'El mes debe estar en formato YYYY-MM' })
    }

    const data = await projectionsService.getMonthlyPlan(userId, month)
    res.json(data)
  } catch (error) {
    console.error('Error in getMonthlyPlan:', error)
    res.status(500).json({ error: 'Error al obtener plan mensual' })
  }
}

export const upsertMonthlyPlan = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const data = await projectionsService.upsertMonthlyPlan(userId, req.body)
    res.json(data)
  } catch (error) {
    console.error('Error in upsertMonthlyPlan:', error)
    res.status(500).json({ error: 'Error al guardar el plan mensual' })
  }
}
