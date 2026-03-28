import { prisma } from '../config/prisma'
import { addMonths, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getSavingsTrend } from './analytics.service'
import { convertAmount } from './exchangeRate.service'

/**
 * -------------------------------------------------------------
 * 1. PROYECCIONES DE AHORRO
 * -------------------------------------------------------------
 */

export interface MonthProjection {
  month: string
  label: string
  projectedBalance: number
  projectedSavings: number
  savingsRate: number
}

export interface GoalProjection {
  goalId: string
  goalName: string
  targetAmount: number
  currentAmount: number
  targetInBase: number
  currentInBase: number
  monthsToComplete: {
    conservative: number | null
    current: number | null
    optimistic: number | null
  }
}

export interface SavingsProjectionResponse {
  currentBalance: number
  monthlyIncomeAvg: number
  monthlyExpenseAvg: number
  savingsRateAvg: number
  currency: string
  scenarios: {
    conservative: MonthProjection[]
    current: MonthProjection[]
    optimistic: MonthProjection[]
  }
  goalProjections: GoalProjection[]
}

export async function getSavingsProjection(userId: string): Promise<SavingsProjectionResponse> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } })
  const currency = settings?.baseCurrency || 'DOP'

  // Usamos el servicio de analíticas para obtener los últimos 3 meses
  const trendData = await getSavingsTrend(userId, 3)
  const last3 = trendData.months
  
  const totalIncome = last3.reduce((acc, m) => acc + m.income, 0)
  const totalExp = last3.reduce((acc, m) => acc + m.expenses, 0)
  
  const count = last3.length > 0 ? last3.length : 1
  const monthlyIncomeAvg = totalIncome / count
  const monthlyExpenseAvg = totalExp / count
  const savingsRateAvg = monthlyIncomeAvg > 0 ? ((monthlyIncomeAvg - monthlyExpenseAvg) / monthlyIncomeAvg) : 0

  const conservativeRate = savingsRateAvg * 0.8
  const currentRate = savingsRateAvg
  const optimisticRate = savingsRateAvg * 1.2

  // Obtener balance actual (estimado del acumulado reciente neto del query o usando totalIncome - totalExp general)
  // Usaremos el acumulado de los últimos 3 meses como "punto de partida" referencial o 0 si no hay histórico
  const currentBalance = totalIncome - totalExp

  const scenarios = {
    conservative: [] as MonthProjection[],
    current: [] as MonthProjection[],
    optimistic: [] as MonthProjection[],
  }

  let balCons = currentBalance
  let balCurr = currentBalance
  let balOpti = currentBalance

  let savCons = 0
  let savCurr = 0
  let savOpti = 0

  const projectionMonths = 36 // Proyectar hasta 3 años

  // Buscamos si hay un MonthlyPlan para cada mes proyectado, pero como iteramos 36 meses, podría ser pesado.
  // Es mejor extraer todos los planes futuros de un query.
  const futurePlans = await prisma.monthlyPlan.findMany({
    where: { 
      userId, 
      month: { gte: format(new Date(), 'yyyy-MM') } 
    }
  })
  const plansMap = new Map(futurePlans.map(p => [p.month, p]))

  for (let i = 1; i <= projectionMonths; i++) {
    const date = addMonths(new Date(), i)
    const monthStr = format(date, 'yyyy-MM')
    const labelStr = format(date, 'MMM yyyy', { locale: es })
    
    // Base income del plan o del promedio histórico
    const plan = plansMap.get(monthStr)
    const baseIncome = plan?.expectedIncome ?? monthlyIncomeAvg

    // Conservador
    const consSavings = baseIncome * conservativeRate
    balCons += consSavings
    savCons += consSavings
    scenarios.conservative.push({
      month: monthStr,
      label: labelStr,
      projectedBalance: balCons,
      projectedSavings: savCons,
      savingsRate: conservativeRate
    })

    // Actual
    const currSavings = baseIncome * currentRate
    balCurr += currSavings
    savCurr += currSavings
    scenarios.current.push({
      month: monthStr,
      label: labelStr,
      projectedBalance: balCurr,
      projectedSavings: savCurr,
      savingsRate: currentRate
    })

    // Optimista
    const optiSavings = baseIncome * optimisticRate
    balOpti += optiSavings
    savOpti += optiSavings
    scenarios.optimistic.push({
      month: monthStr,
      label: labelStr,
      projectedBalance: balOpti,
      projectedSavings: savOpti,
      savingsRate: optimisticRate
    })
  }

  // Meta proyecciones
  const allGoals = await prisma.savingsGoal.findMany({ where: { userId } })
  const activeGoals = allGoals.filter(g => g.currentAmount < g.targetAmount)

  const goalProjections: GoalProjection[] = await Promise.all(activeGoals.map(async goal => {
    // La DB dicta que SavingsGoal tiene "currency" o se asume USD
    const goalCurrency = (goal as any).currency || 'USD'
    const targetInBase = await convertAmount(goal.targetAmount, goalCurrency, currency)
    const currentInBase = await convertAmount(goal.currentAmount ?? 0, goalCurrency, currency)
    
    const remaining = targetInBase - currentInBase

    const findMonthReached = (scenario: MonthProjection[]) => {
      const idx = scenario.findIndex(s => s.projectedSavings >= remaining)
      return idx !== -1 ? idx + 1 : null // +1 porque el array es 0-indexed pero representa el mes 1, 2, 3...
    }

    return {
      goalId: goal.id,
      goalName: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetInBase,
      currentInBase,
      monthsToComplete: {
        conservative: findMonthReached(scenarios.conservative),
        current: findMonthReached(scenarios.current),
        optimistic: findMonthReached(scenarios.optimistic)
      }
    }
  }))

  return {
    currentBalance,
    monthlyIncomeAvg,
    monthlyExpenseAvg,
    savingsRateAvg,
    currency,
    scenarios,
    goalProjections
  }
}

/**
 * -------------------------------------------------------------
 * 2. PLANIFICADOR DEL PRÓXIMO MES
 * -------------------------------------------------------------
 */

export interface NextMonthPlanInput {
  expectedIncome: number
  fixedExpenses: { name: string; amount: number; categoryId?: string }[]
  savingsGoal?: number
  months: number // default 1
}

export interface NextMonthPlanResponse {
  month: string
  totalIncome: number
  totalFixedExpenses: number
  availableForVariable: number
  suggestedBudgets: {
    categoryId: string
    categoryName: string
    suggestedAmount: number
    historicalAvg: number
    isFixed: boolean
    fixedAmount?: number
  }[]
  projectedSavings: number
  savingsRate: number
  warnings: string[]
}

export async function generateNextMonthPlan(
  userId: string, 
  input: NextMonthPlanInput
): Promise<NextMonthPlanResponse> {
  const warnings: string[] = []
  const monthTarget = format(addMonths(new Date(), input.months), 'yyyy-MM')

  // 1. Cálculos de fijos
  const totalFixedExpenses = input.fixedExpenses.reduce((sum, e) => sum + e.amount, 0)

  // 2. Metas de ahorro requeridas (como en budgetWizard)
  let actualSavingsGoal = input.savingsGoal
  if (actualSavingsGoal === undefined) {
    const allGoals = await prisma.savingsGoal.findMany({ where: { userId } })
    const activeGoals = allGoals.filter(g => g.currentAmount < g.targetAmount)
    
    const goalsMonthlyRequired = activeGoals.reduce((sum, goal) => {
      const remaining = goal.targetAmount - goal.currentAmount
      if (remaining <= 0 || !goal.deadline) return sum
      
      const diffTime = new Date(goal.deadline).getTime() - new Date().getTime()
      const daysLeft = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
      const monthsLeft = daysLeft / 30
      return sum + (remaining / monthsLeft)
    }, 0)

    actualSavingsGoal = goalsMonthlyRequired
  }

  // 3. Cálculo de variable
  const availableForVariable = input.expectedIncome - totalFixedExpenses - actualSavingsGoal

  if (availableForVariable < 0) {
    warnings.push('CRÍTICO: Tus gastos fijos y meta de ahorro superan tus ingresos esperados.')
  } else if (totalFixedExpenses > input.expectedIncome * 0.6) {
    warnings.push('El total de gastos fijos supera el 60% de tus ingresos.')
  }

  // 4. Analizar el historial de 3 meses para variables
  const threeMonthsAgo = addMonths(new Date(), -3)
  const txs = await prisma.transaction.findMany({
    where: { 
      userId, 
      date: { gte: threeMonthsAgo }, 
      deletedAt: null, 
      type: 'EXPENSE' 
    },
    include: { category: true }
  })

  // Agrupar historial por categoría para obtener el AVG
  const catStats = new Map<string, { total: number }>()
  for (const t of txs) {
    if (!t.categoryId) continue
    if (!catStats.has(t.categoryId)) catStats.set(t.categoryId, { total: 0 })
    catStats.get(t.categoryId)!.total += t.amount
  }

  const allCategories = await prisma.category.findMany({ 
    where: { OR: [{ userId }, { isDefault: true }] }
  })
  
  // Excluir ingresos
  const expenseCategories = allCategories.filter(c => c.name !== 'Income' && c.name !== 'Ingresos')

  let sumHistoricalVariables = 0
  
  // Set of fixed category IDs
  const fixedCategoryIds = new Set(input.fixedExpenses.filter(e => e.categoryId).map(e => e.categoryId))

  const variableCategoriesAvg: { id: string; name: string; avg: number }[] = []

  for (const cat of expenseCategories) {
    if (fixedCategoryIds.has(cat.id)) continue // omitimos las que fueron declaradas como fijas en el planner

    const total3Mon = catStats.get(cat.id)?.total || 0
    const avg = total3Mon / 3
    if (avg > 0) {
      variableCategoriesAvg.push({ id: cat.id, name: cat.name, avg })
      sumHistoricalVariables += avg
    }
  }

  const suggestedBudgets: NextMonthPlanResponse['suggestedBudgets'] = []

  // 5. Inyectar fijas
  for (const f of input.fixedExpenses) {
    if (f.categoryId) {
      const cat = expenseCategories.find(c => c.id === f.categoryId)
      suggestedBudgets.push({
        categoryId: f.categoryId,
        categoryName: cat ? cat.name : f.name,
        suggestedAmount: f.amount,
        historicalAvg: (catStats.get(f.categoryId)?.total || 0) / 3,
        isFixed: true,
        fixedAmount: f.amount
      })
    }
  }

  // 6. Distribuir variable
  // El availableForVariable se distribuye proporcionalmente según cuánto gastaba en esa categoría
  const amountToDistribute = Math.max(0, availableForVariable)
  
  for (const vCat of variableCategoriesAvg) {
    const fraction = sumHistoricalVariables > 0 ? (vCat.avg / sumHistoricalVariables) : 0
    const suggestedAmount = amountToDistribute * fraction

    suggestedBudgets.push({
      categoryId: vCat.id,
      categoryName: vCat.name,
      suggestedAmount: suggestedAmount,
      historicalAvg: vCat.avg,
      isFixed: false
    })
  }

  const savingsRate = input.expectedIncome > 0 ? (actualSavingsGoal / input.expectedIncome) * 100 : 0

  return {
    month: monthTarget,
    totalIncome: input.expectedIncome,
    totalFixedExpenses,
    availableForVariable,
    suggestedBudgets: suggestedBudgets.sort((a, b) => b.suggestedAmount - a.suggestedAmount),
    projectedSavings: actualSavingsGoal,
    savingsRate,
    warnings
  }
}

/**
 * -------------------------------------------------------------
 * 3. FUNCIONES CRUD PARA GASTOS FIJOS Y PLANES MENSUALES
 * -------------------------------------------------------------
 */

export async function getRecurringExpenses(userId: string) {
  return prisma.recurringExpense.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { category: true }
  })
}

export async function upsertRecurringExpense(userId: string, data: any) {
  // data should contain { id?, name, amount, categoryId?, frequency?, dayOfMonth? }
  if (data.id) {
    return prisma.recurringExpense.update({
      where: { id: data.id },
      data: {
        name: data.name,
        amount: data.amount,
        categoryId: data.categoryId,
        frequency: data.frequency,
        dayOfMonth: data.dayOfMonth,
        isActive: data.isActive
      }
    })
  } else {
    return prisma.recurringExpense.create({
      data: {
        userId,
        name: data.name,
        amount: data.amount,
        categoryId: data.categoryId,
        frequency: data.frequency || 'monthly',
        dayOfMonth: data.dayOfMonth,
        isActive: data.isActive ?? true
      }
    })
  }
}

export async function deleteRecurringExpense(userId: string, id: string) {
  // Validate ownership first
  const expense = await prisma.recurringExpense.findUnique({ where: { id } })
  if (!expense || expense.userId !== userId) throw new Error('Not found')
  
  await prisma.recurringExpense.delete({ where: { id } })
}

export async function getMonthlyPlan(userId: string, month: string) {
  return prisma.monthlyPlan.findUnique({
    where: { userId_month: { userId, month } }
  })
}

export async function upsertMonthlyPlan(userId: string, data: any) {
  return prisma.monthlyPlan.upsert({
    where: { userId_month: { userId, month: data.month } },
    update: {
      expectedIncome: data.expectedIncome,
      incomeSources: data.incomeSources,
      savingsTarget: data.savingsTarget,
      notes: data.notes,
      status: data.status
    },
    create: {
      userId,
      month: data.month,
      expectedIncome: data.expectedIncome,
      incomeSources: data.incomeSources,
      savingsTarget: data.savingsTarget,
      notes: data.notes,
      status: data.status || 'draft'
    }
  })
}
