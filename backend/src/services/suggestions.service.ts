import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function generateSuggestions(userId: string) {
  try {
    // Eliminar expiradas
    await prisma.goalSuggestion.deleteMany({
      where: { userId, expiresAt: { lt: new Date() }, accepted: false, dismissed: false }
    })

    // Obtener sugerencias activas
    const activeSuggestions = await prisma.goalSuggestion.findMany({
      where: { userId, accepted: false, dismissed: false }
    })

    // Si ya tenemos 5 activas, devolvemos esas
    if (activeSuggestions.length >= 5) {
      return prisma.goalSuggestion.findMany({
        where: { userId, accepted: false, dismissed: false },
        include: { category: true },
        orderBy: { confidence: 'desc' }
      })
    }

    // Analizar ultimos 3 meses
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const txs = await prisma.transaction.findMany({
      where: { userId, date: { gte: threeMonthsAgo }, deletedAt: null },
      include: { category: true }
    })

    // Caso edge: 0 transacciones = no hay data para sugerir
    if (!txs || txs.length === 0) {
      console.log(`[generateSuggestions] 0 transacciones recientes para ${userId}. Retornando [] silente.`)
      return []
    }

    const settings = await prisma.userSettings.findUnique({ where: { userId } })
    const baseCurrency = settings?.baseCurrency || 'DOP'

    const newSuggestions = []

    // Calcular ingresos y gastos mensuales promedios
    const incomeTxs = txs.filter(t => t.type === 'INCOME')
    const expenseTxs = txs.filter(t => t.type === 'EXPENSE')

    const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0)
    const avgIncome = totalIncome / 3
    
    const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0)
    const avgExpense = totalExpense / 3

    console.log(`[generateSuggestions] Analizando:`)
    console.log(` - Txs encontradas (3m): ${txs.length}`)
    console.log(` - Ingresos promedios/mes: ${avgIncome}`)
    console.log(` - Gastos promedios/mes: ${avgExpense}`)

  // TIPO 2: BUILD_EMERGENCY_FUND
  const existingEmergency = await prisma.savingsGoal.findFirst({
    where: { userId, name: { contains: 'emergencia', mode: 'insensitive' } }
  })
  
  const hasActiveEmergencySuggestion = activeSuggestions.some(s => s.type === 'BUILD_EMERGENCY_FUND')
  
  if (!existingEmergency && !hasActiveEmergencySuggestion && avgExpense > 0) {
    console.log(`[generateSuggestions] TYPE 2: Se generó BUILD_EMERGENCY_FUND. Meta mensual sugerida: 3x average expense.`)
    newSuggestions.push({
      userId,
      currency: baseCurrency,
      type: 'BUILD_EMERGENCY_FUND',
      title: 'Crear un fondo de emergencia',
      description: 'Acumular efectivo para imprevistos te protege financieramente y te da tranquilidad.',
      targetAmount: avgExpense * 3,
      monthlySaving: avgExpense * 3 / 6, // Meta a 6 meses
      yearlySaving: avgExpense * 3,
      confidence: 1.0,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    })
  } else {
    console.log(`[generateSuggestions] TYPE 2 DESCARTADO: existingEmergency=${!!existingEmergency}, hasActiveEmergencySuggestion=${hasActiveEmergencySuggestion}, avgExpense=${avgExpense}`)
  }

  // TIPO 1: REDUCE_CATEGORY
  const categoriesMap = new Map<string, { total: number; months: Set<number> }>()
  for (const t of expenseTxs) {
    if (!t.categoryId) continue
    const stat = categoriesMap.get(t.categoryId) || { total: 0, months: new Set() }
    stat.total += t.amount
    stat.months.add(new Date(t.date).getMonth())
    categoriesMap.set(t.categoryId, stat)
  }

  for (const [catId, stats] of categoriesMap.entries()) {
    const avgMonthlyCatSpend = stats.total / 3
    
    const catTotalPercent = avgExpense > 0 ? (avgMonthlyCatSpend / avgExpense) * 100 : 0
    console.log(`[generateSuggestions] TYPE 1 Eval: Categoría ${catId}: RD$ ${avgMonthlyCatSpend.toFixed(2)} = ${catTotalPercent.toFixed(1)}% del gasto (threshold 20%)`)

    if (avgExpense > 0 && avgMonthlyCatSpend > (avgExpense * 0.20)) {
      const alreadySuggested = activeSuggestions.some(s => s.type === 'REDUCE_CATEGORY' && s.categoryId === catId)
      if (!alreadySuggested) {
        console.log(`[generateSuggestions] TYPE 1 GENERATED: Reducir Categoría ${catId} (está por encima del 20%).`)
        const targetSpend = avgExpense * 0.15 // Sugerimos reducirla a 15% del gasto
        const monthlySaving = avgMonthlyCatSpend - targetSpend
        newSuggestions.push({
          userId,
          currency: baseCurrency,
          type: 'REDUCE_CATEGORY',
          categoryId: catId,
          title: 'Reduce gastos de esta categoria',
          description: 'Tus gastos aqui superan el 20% de tus salidas totales. Intentemos reducirlos al 15%.',
          targetAmount: targetSpend, 
          currentSpend: avgMonthlyCatSpend,
          suggestedSpend: targetSpend,
          monthlySaving,
          yearlySaving: monthlySaving * 12,
          confidence: stats.months.size >= 3 ? 0.9 : 0.6,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        })
      } else {
        console.log(`[generateSuggestions] TYPE 1 DESCARTADO: Categoría ${catId} ya sugerida anteriormente.`)
      }
    }
  }

  // TIPO 3: ELIMINATE_SUBSCRIPTION
  const subscriptionMerchants = ['Netflix', 'Spotify', 'Adobe', 'Amazon', 'Apple', 'Hulu', 'Disney+']
  const subs = expenseTxs.filter(t => 
    t.amount < 500 && // Equivalente estimado
    t.merchant && subscriptionMerchants.some(m => t.merchant!.toLowerCase().includes(m.toLowerCase()))
  )

  const merchantCounts = new Map<string, number>()
  for (const t of subs) {
    if (t.merchant) merchantCounts.set(t.merchant, (merchantCounts.get(t.merchant) || 0) + 1)
  }

  let subsAmount = 0
  let multipleSubs = 0
  for (const [merch, count] of merchantCounts.entries()) {
    if (count >= 2) {
      multipleSubs++
      subsAmount += (subs.find(s => s.merchant === merch)?.amount || 0)
    }
  }

  if (multipleSubs >= 3) {
    const alreadySuggested = activeSuggestions.some(s => s.type === 'ELIMINATE_SUBSCRIPTION')
    if (!alreadySuggested) {
      console.log(`[generateSuggestions] TYPE 3 GENERATED: Eliminar suscripción (detectadas: ${multipleSubs}).`)
      const avgSubSpend = subsAmount // Monthly roughly
      newSuggestions.push({
        userId,
        currency: baseCurrency,
        type: 'ELIMINATE_SUBSCRIPTION',
        title: 'Depura tus suscripciones activas',
        description: 'Hemos detectado varias suscripciones. Si hay alguna que no usas, cancelarla genera ahorro puro.',
        targetAmount: avgSubSpend,
        currentSpend: avgSubSpend,
        suggestedSpend: 0,
        monthlySaving: avgSubSpend,
        yearlySaving: avgSubSpend * 12,
        confidence: 0.6,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
    } else {
       console.log(`[generateSuggestions] TYPE 3 DESCARTADO: Ya existía sugerencia de suscripciones.`)
    }
  } else {
    console.log(`[generateSuggestions] TYPE 3 DESCARTADO: Muy pocas suscripciones detectadas (< 3). Múltiples encontradas: ${multipleSubs}.`)
  }

  // TIPO 4: INCREASE_SAVINGS_RATE
  const currentSavingsRate = avgIncome > 0 ? ((avgIncome - avgExpense) / avgIncome) : 0
  if (currentSavingsRate > 0 && currentSavingsRate < 0.10) {
    const alreadySuggested = activeSuggestions.some(s => s.type === 'INCREASE_SAVINGS_RATE')
    if (!alreadySuggested) {
      console.log(`[generateSuggestions] TYPE 4 GENERATED: Tasa de ahorro baja detectada (${(currentSavingsRate*100).toFixed(1)}%). Recomendando aumentarla.`)
      const targetSavingsRate = currentSavingsRate + 0.06 // 2% per month for 3 months
      const monthlySaving = (targetSavingsRate - currentSavingsRate) * avgIncome
      newSuggestions.push({
        userId,
        currency: baseCurrency,
        type: 'INCREASE_SAVINGS_RATE',
        title: 'Acelera tu tasa de ahorro',
        description: 'Tu nivel de ahorro es menor al 10%. Construye el hábito aumentando gradualmente 2% al mes.',
        targetAmount: monthlySaving, // Goal is to save this extra amount
        monthlySaving: monthlySaving,
        yearlySaving: monthlySaving * 12,
        confidence: 0.8,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
    } else {
      console.log(`[generateSuggestions] TYPE 4 DESCARTADO: Ya existía sugerencia para tasa de ahorro.`)
    }
  } else {
    console.log(`[generateSuggestions] TYPE 4 DESCARTADO: currentSavingsRate=${currentSavingsRate.toFixed(2)} fuera de rago (0-0.10).`)
  }

    // Filtrar duplicados / límite de 5
    if (newSuggestions.length > 0) {
      const sorted = newSuggestions.sort((a, b) => b.yearlySaving - a.yearlySaving)
      const toCreate = sorted.slice(0, Math.max(0, 5 - activeSuggestions.length))
      try {
        await prisma.goalSuggestion.createMany({ data: toCreate })
      } catch (err: any) {
        console.error('[generateSuggestions] Error en createMany de suggestions:', err.message)
      }
    }

    return prisma.goalSuggestion.findMany({
      where: { userId, accepted: false, dismissed: false },
      include: { category: true },
      orderBy: { confidence: 'desc' }
    })
  } catch (err: any) {
    console.error('[generateSuggestions] Error global:', err.message, err.stack)
    throw err
  }
}

export async function acceptSuggestion(userId: string, suggestionId: string, adjustments?: { targetAmount?: number; months?: number }) {
  const suggestion = await prisma.goalSuggestion.findUnique({ where: { id: suggestionId } })
  if (!suggestion || suggestion.userId !== userId) throw new Error('Sugerencia no encontrada')

  const targetAmount = adjustments?.targetAmount || suggestion.targetAmount
  const currentAmount = 0
  const deadline = new Date()
  deadline.setMonth(deadline.getMonth() + (adjustments?.months || 6))

  const newGoal = await prisma.savingsGoal.create({
    data: {
      userId,
      name: `Meta: ${suggestion.title}`,
      targetAmount,
      currentAmount,
      currency: suggestion.currency,
      deadline,
      emoji: suggestion.type === 'BUILD_EMERGENCY_FUND' ? '🚑' : '🎯',
    }
  })

  await prisma.goalSuggestion.update({
    where: { id: suggestionId },
    data: { accepted: true, goalId: newGoal.id }
  })

  return newGoal
}

export async function dismissSuggestion(userId: string, suggestionId: string) {
  const suggestion = await prisma.goalSuggestion.findUnique({ where: { id: suggestionId } })
  if (!suggestion || suggestion.userId !== userId) throw new Error('Not found')
  
  return prisma.goalSuggestion.update({
    where: { id: suggestionId },
    data: { dismissed: true }
  })
}

export async function getActiveSuggestions(userId: string) {
  return prisma.goalSuggestion.findMany({
    where: { 
      userId, 
      accepted: false, 
      dismissed: false,
      expiresAt: { gt: new Date() }
    },
    include: { category: true },
    orderBy: { confidence: 'desc' }
  })
}
