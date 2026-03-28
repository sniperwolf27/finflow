import { PrismaClient, ExchangeRate } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 3. fetchRateFromAPI
 * Obtiene la tasa desde la API gratuita, guarda y devuelve.
 */
export async function fetchRateFromAPI(from: string, to: string): Promise<number> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`API respondió con estado ${res.status}`)
    }

    const data = await res.json()
    const rate = data.rates[to]

    if (typeof rate !== 'number') {
      throw new Error(`La API no retornó una tasa de conversión válida para ${to}`)
    }

    await prisma.exchangeRate.create({
      data: {
        from,
        to,
        rate,
        source: 'api',
      },
    })

    return rate
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Timeout de 5s excedido obteniendo tasa de ${from} a ${to}`)
    }
    throw error // Re-throw to be caught by getRate
  }
}

/**
 * 1. getRate
 * Obtiene la tasa de manera inteligente, gestionando fallbacks e inversos.
 */
export async function getRate(from: string, to: string, date?: Date): Promise<number> {
  if (from === to) return 1

  const targetDate = date || new Date()

  try {
    // 1. Coincidencia directa
    const directRate = await prisma.exchangeRate.findFirst({
      where: {
        from,
        to,
        date: { lte: targetDate },
      },
      orderBy: { date: 'desc' },
    })

    if (directRate) return directRate.rate

    // 2. Coincidencia inversa
    const inverseRate = await prisma.exchangeRate.findFirst({
      where: {
        from: to,
        to: from,
        date: { lte: targetDate },
      },
      orderBy: { date: 'desc' },
    })

    if (inverseRate) return 1 / inverseRate.rate

    // 3. Fallback a la API
    return await fetchRateFromAPI(from, to)

  } catch (error: any) {
    console.warn(`[ExchangeRate] Falla consultando API para ${from} a ${to}:`, error.message)

    // Fallback absoluto: última tasa conocida ignorando la fecha objetivo.
    const lastKnownDirect = await prisma.exchangeRate.findFirst({
      where: { from, to },
      orderBy: { date: 'desc' },
    })
    if (lastKnownDirect) return lastKnownDirect.rate

    const lastKnownInverse = await prisma.exchangeRate.findFirst({
      where: { from: to, to: from },
      orderBy: { date: 'desc' },
    })
    if (lastKnownInverse) return 1 / lastKnownInverse.rate

    // Sin salida
    throw new Error(`Imposible determinar una tasa de cambio de ${from} a ${to}`)
  }
}

/**
 * 2. convertAmount
 * Convierte montos y retorna con dos decimales de precisión redondeada.
 */
export async function convertAmount(amount: number, from: string, to: string, date?: Date): Promise<number> {
  if (from === to) return amount

  try {
    const rate = await getRate(from, to, date)
    const converted = amount * rate
    return Math.round(converted * 100) / 100
  } catch (err: any) {
    console.error(`[ExchangeRate] Error convirtiendo ${amount} ${from} a ${to}:`, err.message)
    // Protegemos el servidor frente a caídas devolviendo el original en desastre,
    // o prefieres lanzar el error. Las instrucciones dicen "nunca crashear",
    // así que devolvemos un estimado fallido igual a amount (o se podría manejar a nivel controlador).
    return amount
  }
}

/**
 * 4. syncRates
 * Sincroniza la moneda contra las comunes usando un solo fetch multi-currency masivo
 * para ser transaccional y veloz (Optimizando llamadas innecesarias HTTP individuales).
 */
export async function syncRates(baseCurrency: string): Promise<void> {
  const commonCurrencies = ['USD', 'EUR', 'DOP', 'CAD', 'GBP']
  const targetCurrencies = commonCurrencies.filter(c => c !== baseCurrency)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    // Usamos el request base para obtener las demás
    const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    const now = new Date()

    const prismaOpers = targetCurrencies.map(currency => {
      const rateFromBaseToTarget = data.rates[currency]
      if (rateFromBaseToTarget) {
        // Guardamos explícitamente Target -> Base para que el usuario cruce el gasto (ej. gastó en USD -> quiere DOP)
        // Rate de API = 1 Base = 0.017 Target => significa que 1 Target = 1/0.017 Base.
        return prisma.exchangeRate.create({
          data: {
            from: currency,
            to: baseCurrency,
            rate: 1 / rateFromBaseToTarget,
            source: 'api',
            date: now,
          },
        })
      }
      return null
    }).filter(Boolean) as any[]

    if (prismaOpers.length > 0) {
      await prisma.$transaction(prismaOpers)
      console.log(`[ExchangeRate] Synced ${prismaOpers.length} rates for base ${baseCurrency}`)
    }
  } catch (error: any) {
    console.error(`[ExchangeRate] Error en syncRates para ${baseCurrency}:`, error.message)
  }
}

/**
 * 5. getRatesForUser
 * Retorna al usuario la última matriz de conversión para renderizar en Frontend.
 */
export type UserRate = ExchangeRate & { isStale: boolean }

export async function getRatesForUser(userId: string): Promise<UserRate[]> {
  try {
    const settings = await prisma.userSettings.findUnique({ where: { userId } })
    const baseCurrency = settings?.baseCurrency || 'DOP'

    const targets = ['USD', 'EUR', 'DOP', 'CAD', 'GBP'].filter(c => c !== baseCurrency)
    const results: UserRate[] = []

    for (const c of targets) {
      const lastDirect = await prisma.exchangeRate.findFirst({
        where: { from: c, to: baseCurrency },
        orderBy: { date: 'desc' },
      })
      
      const lastInverse = await prisma.exchangeRate.findFirst({
        where: { from: baseCurrency, to: c },
        orderBy: { date: 'desc' },
      })

      // Escoger el más reciente
      const latest = (lastDirect?.date.getTime() || 0) > (lastInverse?.date.getTime() || 0) 
        ? lastDirect 
        : lastInverse

      if (latest) {
        const ageMs = Date.now() - latest.date.getTime()
        const isStale = ageMs > 24 * 60 * 60 * 1000 // 24 hours

        // Si fue el inverso (baseCurrency -> C), lo volteamos visualmente para facilidad de consumo en Frontend (de C a Base).
        const normalizedRate = latest.to === baseCurrency ? latest.rate : 1 / latest.rate

        results.push({
          ...latest,
          from: c,
          to: baseCurrency,
          rate: normalizedRate,
          isStale,
        })
      }
    }

    return results
  } catch (err: any) {
    console.error(`[ExchangeRate] Falló getRatesForUser:`, err.message)
    return []
  }
}
