import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { env } from '../config/env'
import { monthsAgo } from '../utils/date'

const isPostgres = env.DATABASE_PROVIDER === 'postgresql'

const monthExpr = isPostgres
  ? Prisma.raw(`TO_CHAR(date, 'YYYY-MM')`)
  : Prisma.raw(`strftime('%Y-%m', datetime((date/1000), 'unixepoch'))`)
  // Note: Prisma stores dates as epoch in SQLite sometimes, but often it stores them as strings or numbers. 
  // Let's use the exact pattern the user asked for:
const userMonthExpr = isPostgres
  ? Prisma.raw(`TO_CHAR(date, 'YYYY-MM')`)
  : Prisma.raw(`strftime('%Y-%m', "date"/1000.0, 'unixepoch')`)
  
// I will just use the standard format requested by user:
const monthSQL = isPostgres 
  ? Prisma.raw(`TO_CHAR("date", 'YYYY-MM')`)
  : Prisma.raw(`strftime('%Y-%m', "date"/1000, 'unixepoch')`)

// But wait, the user explicitly provided this exact pattern:
// const monthExpr = isPostgres ? `TO_CHAR(date, 'YYYY-MM')` : `strftime('%Y-%m', date)`;
const monthExprSimple = isPostgres ? Prisma.raw(`TO_CHAR("date", 'YYYY-MM')`) : Prisma.raw(`strftime('%Y-%m', "date")`);
const dowExprSimple = isPostgres ? Prisma.raw(`EXTRACT(DOW FROM "date")::int`) : Prisma.raw(`CAST(strftime('%w', "date") AS INTEGER)`);


export async function getCategoryTrends(userId: string, months: number) {
  const fromDate = monthsAgo(months)
  const isDuplicate = false

  const rawData = await prisma.$queryRaw<
    { categoryId: string | null; month: string; total: number; count: number }[]
  >`
    SELECT 
      "categoryId",
      ${monthExprSimple} as "month",
      SUM("amount") as "total",
      CAST(COUNT("id") AS INTEGER) as "count"
    FROM "Transaction"
    WHERE "userId" = ${userId}
      AND "type" = 'EXPENSE'
      AND "deletedAt" IS NULL
      AND "isDuplicate" = ${isDuplicate}
      AND "date" >= ${fromDate}
    GROUP BY "categoryId", ${monthExprSimple}
    ORDER BY "categoryId", "month" ASC
  `

  const categories = await prisma.category.findMany({
    where: { OR: [{ userId }, { isDefault: true }] }
  })
  const catMap = new Map(categories.map(c => [c.id, c]))

  const defaultCat = { name: 'Uncategorized', color: '#94a3b8', icon: 'tag' }

  const grouped = new Map<string, any>()

  for (const row of rawData) {
    const cid = row.categoryId || 'uncategorized'
    if (!grouped.has(cid)) {
      const catInfo = row.categoryId ? catMap.get(row.categoryId) || defaultCat : defaultCat
      grouped.set(cid, {
        categoryId: row.categoryId,
        categoryName: catInfo.name,
        categoryColor: catInfo.color,
        categoryIcon: catInfo.icon,
        months: [],
        totalPeriod: 0,
        avgMonthly: 0,
        trend: 'stable'
      })
    }
    const catData = grouped.get(cid)!
    catData.months.push({ month: row.month, amount: row.total, transactionCount: Number(row.count) })
    catData.totalPeriod += row.total
  }

  const result = Array.from(grouped.values()).map(catData => {
    catData.avgMonthly = catData.totalPeriod / months
    
    // Trend logic: compare first half vs second half
    const half = Math.ceil(catData.months.length / 2)
    if (half > 0 && catData.months.length > 1) {
      const firstHalf = catData.months.slice(0, half).reduce((sum: number, m: any) => sum + m.amount, 0)
      const secondHalf = catData.months.slice(half).reduce((sum: number, m: any) => sum + m.amount, 0)
      if (secondHalf > firstHalf * 1.1) catData.trend = 'increasing'
      else if (secondHalf < firstHalf * 0.9) catData.trend = 'decreasing'
    }
    return catData
  })

  // Sort by totalPeriod desc
  result.sort((a, b) => b.totalPeriod - a.totalPeriod)

  return {
    categories: result,
    periodMonths: months
  }
}

export async function getSavingsTrend(userId: string, months: number) {
  const fromDate = monthsAgo(months)
  const isDuplicate = false

  const rawData = await prisma.$queryRaw<
    { month: string; type: string; total: number }[]
  >`
    SELECT 
      ${monthExprSimple} as "month",
      "type",
      SUM("amount") as "total"
    FROM "Transaction"
    WHERE "userId" = ${userId}
      AND "type" IN ('INCOME', 'EXPENSE')
      AND "deletedAt" IS NULL
      AND "isDuplicate" = ${isDuplicate}
      AND "date" >= ${fromDate}
    GROUP BY ${monthExprSimple}, "type"
    ORDER BY "month" ASC
  `

  const monthMap = new Map<string, { income: number; expenses: number; net: number; savingsRate: number; cumulativeNet: number }>()
  
  for (const row of rawData) {
    if (!monthMap.has(row.month)) {
      monthMap.set(row.month, { income: 0, expenses: 0, net: 0, savingsRate: 0, cumulativeNet: 0 })
    }
    const m = monthMap.get(row.month)!
    if (row.type === 'INCOME') m.income += row.total
    else m.expenses += row.total
  }

  let cumulativeNet = 0
  let totalIncome = 0
  let totalSaved = 0
  
  let bestMonth = { month: '', savingsRate: -Infinity }
  let worstMonth = { month: '', savingsRate: Infinity }

  const resultMonths = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([month, data]) => {
    data.net = data.income - data.expenses
    cumulativeNet += data.net
    data.cumulativeNet = cumulativeNet
    data.savingsRate = data.income > 0 ? (data.net / data.income) * 100 : 0
    
    totalIncome += data.income
    totalSaved += data.net

    if (data.savingsRate > bestMonth.savingsRate) bestMonth = { month, savingsRate: data.savingsRate }
    if (data.savingsRate < worstMonth.savingsRate && data.income > 0) worstMonth = { month, savingsRate: data.savingsRate }
    
    return { month, ...data }
  })

  const avgSavingsRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0

  // Trend logic: compare first half vs second half
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  const half = Math.floor(resultMonths.length / 2)
  if (half > 0 && resultMonths.length > 1) {
    const firstHalfAvg = resultMonths.slice(0, half).reduce((sum, m) => sum + m.savingsRate, 0) / half
    const secondHalfAvg = resultMonths.slice(half).reduce((sum, m) => sum + m.savingsRate, 0) / (resultMonths.length - half)
    if (secondHalfAvg > firstHalfAvg + 5) trend = 'improving'
    else if (secondHalfAvg < firstHalfAvg - 5) trend = 'declining'
  }

  return {
    months: resultMonths,
    avgSavingsRate,
    bestMonth: bestMonth.month ? bestMonth : null,
    worstMonth: worstMonth.month ? worstMonth : null,
    trend
  }
}

export async function getSpendingHeatmap(userId: string, months: number) {
  const fromDate = monthsAgo(months)
  const isDuplicate = false

  const byDow = await prisma.$queryRaw<
    { dayIndex: number; total: number; count: number }[]
  >`
    SELECT 
      ${dowExprSimple} as "dayIndex",
      SUM("amount") as "total",
      CAST(COUNT("id") AS INTEGER) as "count"
    FROM "Transaction"
    WHERE "userId" = ${userId}
      AND "type" = 'EXPENSE'
      AND "deletedAt" IS NULL
      AND "isDuplicate" = ${isDuplicate}
      AND "date" >= ${fromDate}
    GROUP BY ${dowExprSimple}
    ORDER BY "dayIndex" ASC
  `

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  
  const byDayOfWeek = byDow.map(d => ({
    day: dayNames[d.dayIndex] || 'Desconocido',
    dayIndex: d.dayIndex,
    avgAmount: d.count > 0 ? d.total / d.count : 0,
    total: d.total,
    transactionCount: Number(d.count)
  }))

  // Week of month (grouping by ISO week could be complex in SQLite, let's group by typical week mapping 1-4 based on day of month)
  // For SQLite simple approach: week = ((strftime('%d', date) - 1) / 7) + 1
  const weekExpr = isPostgres 
    ? Prisma.raw(`((EXTRACT(DAY FROM "date") - 1) / 7 + 1)::int`)
    : Prisma.raw(`CAST(((strftime('%d', "date") - 1) / 7 + 1) AS INTEGER)`)
  
  const byWow = await prisma.$queryRaw<
    { weekIndex: number; total: number; count: number }[]
  >`
    SELECT 
      ${weekExpr} as "weekIndex",
      SUM("amount") as "total",
      CAST(COUNT("id") AS INTEGER) as "count"
    FROM "Transaction"
    WHERE "userId" = ${userId}
      AND "type" = 'EXPENSE'
      AND "deletedAt" IS NULL
      AND "isDuplicate" = ${isDuplicate}
      AND "date" >= ${fromDate}
    GROUP BY ${weekExpr}
    ORDER BY "weekIndex" ASC
  `

  const byWeekOfMonth = byWow.map(w => ({
    week: w.weekIndex,
    label: `Semana ${w.weekIndex}`,
    avgAmount: w.count > 0 ? w.total / w.count : 0,
    total: w.total
  }))

  const peakDayObj = [...byDayOfWeek].sort((a, b) => b.total - a.total)[0]
  const peakWeekObj = [...byWeekOfMonth].sort((a, b) => b.total - a.total)[0]

  return {
    byDayOfWeek,
    byWeekOfMonth,
    peakDay: peakDayObj?.day || null,
    peakWeek: peakWeekObj?.week || null
  }
}

export async function getYoYComparison(userId: string) {
  const isDuplicate = false
  const now = new Date()
  const currentYearNum = now.getFullYear()
  const currentYearStart = new Date(currentYearNum, 0, 1)
  const previousYearStart = new Date(currentYearNum - 1, 0, 1)
  const previousYearEnd = new Date(currentYearNum - 1, 11, 31, 23, 59, 59, 999)

  const monthIdxExpr = isPostgres 
    ? Prisma.raw(`EXTRACT(MONTH FROM "date")::int`)
    : Prisma.raw(`CAST(strftime('%m', "date") AS INTEGER)`)

  const currentYearData = await prisma.$queryRaw<
    { monthIndex: number; type: string; total: number }[]
  >`
    SELECT 
      ${monthIdxExpr} as "monthIndex",
      "type",
      SUM("amount") as "total"
    FROM "Transaction"
    WHERE "userId" = ${userId}
      AND "type" IN ('INCOME', 'EXPENSE')
      AND "deletedAt" IS NULL
      AND "isDuplicate" = ${isDuplicate}
      AND "date" >= ${currentYearStart}
    GROUP BY ${monthIdxExpr}, "type"
  `

  const previousYearData = await prisma.$queryRaw<
    { monthIndex: number; type: string; total: number }[]
  >`
    SELECT 
      ${monthIdxExpr} as "monthIndex",
      "type",
      SUM("amount") as "total"
    FROM "Transaction"
    WHERE "userId" = ${userId}
      AND "type" IN ('INCOME', 'EXPENSE')
      AND "deletedAt" IS NULL
      AND "isDuplicate" = ${isDuplicate}
      AND "date" >= ${previousYearStart} AND "date" <= ${previousYearEnd}
    GROUP BY ${monthIdxExpr}, "type"
  `

  const diffMap = new Map<number, any>()
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  for (let i = 1; i <= 12; i++) {
    diffMap.set(i, {
      month: monthNames[i-1],
      monthIndex: i,
      currentYear: { income: 0, expenses: 0, net: 0 },
      previousYear: { income: 0, expenses: 0, net: 0 },
      expenseDelta: 0,
      incomeDelta: 0,
      netDelta: 0
    })
  }

  for (const row of currentYearData) {
    const o = diffMap.get(row.monthIndex)!
    if (row.type === 'INCOME') o.currentYear.income += row.total
    if (row.type === 'EXPENSE') o.currentYear.expenses += row.total
  }
  for (const row of previousYearData) {
    const o = diffMap.get(row.monthIndex)!
    if (row.type === 'INCOME') o.previousYear.income += row.total
    if (row.type === 'EXPENSE') o.previousYear.expenses += row.total
  }

  let totalCurExp = 0, totalCurInc = 0, totalPrevExp = 0, totalPrevInc = 0

  const monthsResult = Array.from(diffMap.values()).map(o => {
    o.currentYear.net = o.currentYear.income - o.currentYear.expenses
    o.previousYear.net = o.previousYear.income - o.previousYear.expenses

    o.incomeDelta = o.previousYear.income > 0 ? ((o.currentYear.income - o.previousYear.income) / o.previousYear.income) * 100 : 0
    o.expenseDelta = o.previousYear.expenses > 0 ? ((o.currentYear.expenses - o.previousYear.expenses) / o.previousYear.expenses) * 100 : 0
    o.netDelta = o.previousYear.net !== 0 ? ((o.currentYear.net - o.previousYear.net) / Math.abs(o.previousYear.net)) * 100 : 0
    
    totalCurInc += o.currentYear.income
    totalCurExp += o.currentYear.expenses
    totalPrevInc += o.previousYear.income
    totalPrevExp += o.previousYear.expenses
    return o
  })

  const curNet = totalCurInc - totalCurExp
  const prevNet = totalPrevInc - totalPrevExp
  const summary = {
    expenseChangeYTD: totalPrevExp > 0 ? ((totalCurExp - totalPrevExp) / totalPrevExp) * 100 : 0,
    incomeChangeYTD: totalPrevInc > 0 ? ((totalCurInc - totalPrevInc) / totalPrevInc) * 100 : 0,
    netChangeYTD: prevNet !== 0 ? ((curNet - prevNet) / Math.abs(prevNet)) * 100 : 0,
  }

  return {
    months: monthsResult,
    currentYear: currentYearNum,
    previousYear: currentYearNum - 1,
    summary
  }
}

export async function getTopMerchants(userId: string, months: number, limit: number) {
  const fromDate = monthsAgo(months)
  const isDuplicate = false

  const rawData = await prisma.$queryRaw<
    { merchant: string; categoryId: string | null; totalAmount: number; count: number; lastDate: string }[]
  >`
    SELECT 
      "merchant",
      "categoryId",
      SUM("amount") as "totalAmount",
      CAST(COUNT("id") AS INTEGER) as "count",
      MAX("date") as "lastDate"
    FROM "Transaction"
    WHERE "userId" = ${userId}
      AND "type" = 'EXPENSE'
      AND "merchant" IS NOT NULL
      AND "merchant" != ''
      AND "deletedAt" IS NULL
      AND "isDuplicate" = ${isDuplicate}
      AND "date" >= ${fromDate}
    GROUP BY "merchant", "categoryId"
    ORDER BY "totalAmount" DESC
    LIMIT ${limit}
  `

  const totalPeriod = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { userId, type: 'EXPENSE', deletedAt: null, isDuplicate: false, date: { gte: fromDate } }
  })
  
  const totalPeriodExpenses = totalPeriod._sum.amount || 1 // handle 0

  const categories = await prisma.category.findMany({
    where: { OR: [{ userId }, { isDefault: true }] }
  })
  const catMap = new Map(categories.map(c => [c.id, c]))
  const defaultCat = { name: 'Uncategorized', color: '#94a3b8' }

  const merchants = rawData.map(r => {
    const cat = r.categoryId ? catMap.get(r.categoryId) || defaultCat : defaultCat
    return {
      name: r.merchant,
      totalAmount: r.totalAmount,
      transactionCount: Number(r.count),
      avgTransaction: r.totalAmount / Number(r.count),
      lastTransaction: new Date(r.lastDate).toISOString(),
      categoryName: cat.name,
      categoryColor: cat.color,
      percentOfTotal: (r.totalAmount / totalPeriodExpenses) * 100
    }
  })

  // Deduplicate grouped merchants just in case they have multiple categories (combining them)
  const uniqueMerchants = new Map<string, any>()
  for (const m of merchants) {
    if (!uniqueMerchants.has(m.name)) {
      uniqueMerchants.set(m.name, m)
    } else {
      const existing = uniqueMerchants.get(m.name)!
      existing.totalAmount += m.totalAmount
      existing.transactionCount += m.transactionCount
      existing.percentOfTotal += m.percentOfTotal
      existing.avgTransaction = existing.totalAmount / existing.transactionCount
      if (new Date(m.lastTransaction) > new Date(existing.lastTransaction)) {
        existing.lastTransaction = m.lastTransaction
      }
    }
  }

  const finalMerchants = Array.from(uniqueMerchants.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit)

  return {
    merchants: finalMerchants,
    totalPeriodExpenses: totalPeriodExpenses === 1 ? 0 : totalPeriodExpenses
  }
}
