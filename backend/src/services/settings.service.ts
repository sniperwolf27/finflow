import { PrismaClient, UserSettings } from '@prisma/client'
import { syncRates } from './exchangeRate.service'

const prisma = new PrismaClient()

const VALID_CURRENCIES = ['DOP', 'USD', 'EUR', 'GBP', 'CAD']

/**
 * Retorna las configuraciones del usuario o las crea con valores por defecto
 * utilizando la atomicidad nativa de upsert en Prisma.
 */
export async function getOrCreateSettings(userId: string): Promise<UserSettings> {
  return await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      baseCurrency: 'DOP',
    },
  })
}

/**
 * Alias de compatibilidad e interfaz fluída hacia el controller
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  return getOrCreateSettings(userId)
}

/**
 * Actualiza la moneda base del usuario.
 * Lanza la sincronización de conversiones a background sin bloquear la respuesta.
 */
export async function updateBaseCurrency(userId: string, currency: string): Promise<UserSettings> {
  const targetCurrency = currency.toUpperCase()

  if (!VALID_CURRENCIES.includes(targetCurrency)) {
    throw new Error(`Moneda no soportada. Solo aceptamos: ${VALID_CURRENCIES.join(', ')}`)
  }

  const updatedSettings = await prisma.userSettings.upsert({
    where: { userId },
    update: { baseCurrency: targetCurrency },
    create: {
      userId,
      baseCurrency: targetCurrency,
    },
  })

  // Lanzar la descarga de rates en background - Fíjate que omitimos el `await`
  syncRates(targetCurrency).catch(err => {
    console.error(`[SettingsService] Falló el syncRates asincrónico para ${targetCurrency}:`, err.message)
  })

  return updatedSettings
}
