import { prisma } from '../config/prisma'
import { monthsAgo, utcDayBoundaries, utcMonthBoundaries } from '../utils/date'

export async function getSummary(userId: string, month?: string) {
  let dateFrom: Date
  let dateTo: Date

  if (month) {
    const [year, m] = month.split('-').map(Number)
    dateFrom = new Date(year, m - 1, 1)
    dateTo = new Date(year, m, 0, 23, 59, 59, 999)
  } else {
    const now = new Date()
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      isDuplicate: false,
      date: { gte: dateFrom, lte: dateTo },
    },
    select: { type: true, amount: true, currency: true },
  })

  let income = 0
  let expenses = 0

  // Count currency frequency to detect dominant currency
  const currencyCount: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.type === 'INCOME') income += tx.amount
    else if (tx.type === 'EXPENSE') expenses += tx.amount
    const c = tx.currency?.toUpperCase() || 'USD'
    currencyCount[c] = (currencyCount[c] || 0) + 1
  }

  const dominantCurrency = Object.entries(currencyCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'USD'

  return {
    income: Math.round(income * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    net: Math.round((income - expenses) * 100) / 100,
    currency: dominantCurrency,
    period: { from: dateFrom, to: dateTo },
  }
}

export async function getByCategory(userId: string, dateFrom?: Date, dateTo?: Date) {
  const from = dateFrom || monthsAgo(1)
  const to = dateTo || new Date()

  const grouped = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      deletedAt: null,
      isDuplicate: false,
      type: 'EXPENSE',
      date: { gte: from, lte: to },
    },
    _sum: { amount: true },
    _count: { id: true },
  })

  const categories = await prisma.category.findMany({
    where: { id: { in: grouped.map((g) => g.categoryId).filter(Boolean) as string[] } },
  })

  const catMap = new Map(categories.map((c) => [c.id, c]))

  return grouped
    .map((g) => {
      const cat = g.categoryId ? catMap.get(g.categoryId) : null
      return {
        categoryId: g.categoryId,
        name: cat?.name || 'Uncategorized',
        color: cat?.color || '#94a3b8',
        icon: cat?.icon || 'tag',
        total: Math.round((g._sum.amount || 0) * 100) / 100,
        count: g._count.id,
      }
    })
    .sort((a, b) => b.total - a.total)
}

export async function getMonthlyEvolution(userId: string, months = 12) {
  const from = monthsAgo(months)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      isDuplicate: false,
      date: { gte: from },
      type: { in: ['INCOME', 'EXPENSE'] },
    },
    select: { date: true, type: true, amount: true },
    orderBy: { date: 'asc' },
  })

  const map = new Map<string, { income: number; expenses: number }>()

  for (const tx of transactions) {
    const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, { income: 0, expenses: 0 })
    const entry = map.get(key)!
    if (tx.type === 'INCOME') entry.income += tx.amount
    else entry.expenses += tx.amount
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      income: Math.round(data.income * 100) / 100,
      expenses: Math.round(data.expenses * 100) / 100,
      net: Math.round((data.income - data.expenses) * 100) / 100,
    }))
}

export async function getCashFlow(userId: string, weeks = 8) {
  const from = new Date()
  from.setDate(from.getDate() - weeks * 7)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      isDuplicate: false,
      date: { gte: from },
      type: { in: ['INCOME', 'EXPENSE'] },
    },
    select: { date: true, type: true, amount: true },
    orderBy: { date: 'asc' },
  })

  const map = new Map<string, { income: number; expenses: number }>()

  for (const tx of transactions) {
    const d = tx.date
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().split('T')[0]
    if (!map.has(key)) map.set(key, { income: 0, expenses: 0 })
    const entry = map.get(key)!
    if (tx.type === 'INCOME') entry.income += tx.amount
    else entry.expenses += tx.amount
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({
      week,
      income: Math.round(data.income * 100) / 100,
      expenses: Math.round(data.expenses * 100) / 100,
    }))
}

/**
 * Agrupa transacciones por día para un mes específico.
 *
 * DISEÑO DE CONSISTENCIA:
 * - Usa UTC puro en todos los cálculos de fecha para ser agnóstico al TZ del servidor.
 * - `tx.date.getUTCDate()` en lugar de `getDate()` (evita el bug de timezone).
 * - Devuelve `dateFromUtc` y `dateToUtc` por cada día: el frontend DEBE usar
 *   estos mismos valores al filtrar transacciones. Esto garantiza que el gráfico
 *   y la lista de transacciones sumen exactamente lo mismo.
 *
 * Los días sin transacciones incluyen dateFromUtc/dateToUtc igualmente, para
 * que el frontend pueda mostrar "sin transacciones" correctamente.
 */
export async function getDailyEvolution(userId: string, month: string) {
  const [year, m] = month.split('-').map(Number)

  // Usamos UTC puro para los límites del mes completo
  const { from: monthFrom, to: monthTo } = utcMonthBoundaries(year, m)
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate()

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      isDuplicate: false,
      date: { gte: monthFrom, lte: monthTo },
      type: { in: ['INCOME', 'EXPENSE'] },
    },
    select: { date: true, type: true, amount: true },
    orderBy: { date: 'asc' },
  })

  // Initialize all days to zero
  const map = new Map<number, { income: number; expenses: number }>()
  for (let d = 1; d <= daysInMonth; d++) {
    map.set(d, { income: 0, expenses: 0 })
  }

  for (const tx of transactions) {
    // getUTCDate() es consistente independientemente del TZ del servidor.
    // Las fechas se almacenan como UTC; agrupamos en UTC.
    const day = tx.date.getUTCDate()
    const entry = map.get(day)
    if (!entry) continue  // guard: día fuera del rango esperado
    if (tx.type === 'INCOME') entry.income += tx.amount
    else entry.expenses += tx.amount
  }

  return Array.from(map.entries()).map(([day, data]) => {
    const income   = Math.round(data.income   * 100) / 100
    const expenses = Math.round(data.expenses * 100) / 100
    // Los límites UTC exactos de este día son enviados al frontend.
    // El frontend los usa directamente en su query de transacciones,
    // garantizando que el total del gráfico === suma de la lista.
    const { fromIso, toIso } = utcDayBoundaries(year, m, day)
    return {
      day,
      date:        `${month}-${String(day).padStart(2, '0')}`,
      dateFromUtc: fromIso,
      dateToUtc:   toIso,
      income,
      expenses,
      net: Math.round((income - expenses) * 100) / 100,
    }
  })
}

export async function getTopMerchants(userId: string, limit = 10) {
  const from = monthsAgo(1)

  const grouped = await prisma.transaction.groupBy({
    by: ['merchant'],
    where: {
      userId,
      deletedAt: null,
      isDuplicate: false,
      type: 'EXPENSE',
      date: { gte: from },
      merchant: { not: null },
    },
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: limit,
  })

  return grouped.map((g) => ({
    merchant: g.merchant,
    total: Math.round((g._sum.amount || 0) * 100) / 100,
    count: g._count.id,
  }))
}
