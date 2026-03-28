import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { getOrCreateSettings, updateBaseCurrency } from '../services/settings.service'
import { getRatesForUser, syncRates } from '../services/exchangeRate.service'

const prisma = new PrismaClient()

export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const settings = await getOrCreateSettings(userId)
    const rates = await getRatesForUser(userId)
    
    res.json({ settings, rates })
  } catch (error) {
    next(error)
  }
}

export const updateCurrency = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { currency } = req.body
    
    if (!currency || typeof currency !== 'string') {
      res.status(400).json({ error: 'La moneda es requerida o inválida' })
      return
    }

    const settings = await updateBaseCurrency(userId, currency)
    res.json(settings)
  } catch (error: any) {
    if (error.message.includes('No soportada')) {
      res.status(400).json({ error: error.message })
      return
    }
    next(error)
  }
}

export const getExchangeRates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const rates = await getRatesForUser(userId)
    res.json(rates)
  } catch (error) {
    next(error)
  }
}

export const syncExchangeRates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const settings = await getOrCreateSettings(userId)

    // No usar await! Non-blocking background process
    syncRates(settings.baseCurrency).catch(err => {
      console.error(`[ManualSync] Falló sincronización de background:`, err.message)
    })

    res.json({ message: "Sincronización iniciada" })
  } catch (error) {
    next(error)
  }
}

export const setManualRate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to, rate } = req.body
    
    if (!from || !to || typeof rate !== 'number' || rate <= 0) {
      res.status(400).json({ error: 'Parámetros inválidos. El Rate debe ser > 0 y requiere un from y to válidos.' })
      return
    }

    const newRate = await prisma.exchangeRate.create({
      data: {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate,
        source: 'manual',
        date: new Date()
      }
    })

    res.json(newRate)
  } catch (error) {
    next(error)
  }
}
