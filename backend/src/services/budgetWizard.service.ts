import { PrismaClient } from '@prisma/client'
import { upsertBudget } from './budgets.service'

const prisma = new PrismaClient()

export interface BudgetProposal {
  monthlyIncome: number
  currency: string
  rule: {
    needs: number
    wants: number
    savings: number
  }
  goalsMonthlyRequired: number
  adjustedSavings: number
  adjustedNeeds: number
  adjustedWants: number
  categories: BudgetCategoryProposal[]
  warnings: string[]
}

export interface BudgetCategoryProposal {
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  type: 'need' | 'want' | 'saving'
  historicalAvg: number
  historicalMax: number
  suggested: number
  rationale: string
  confidence: 'high' | 'medium' | 'low'
  existingBudget?: {
    id: string
    amount: number
  }
}

const NEEDS_KEYWORDS = [
  'vivienda', 'servicios', 'transporte', 'salud', 'educacion', 'educación', 
  'supermercado', 'seguros', 'renta', 'alquiler', 'medico', 'médico', 'farmacia',
  'utilities', 'housing', 'transport', 'groceries', 'health', 'insurance', 'rent'
]
const SAVINGS_KEYWORDS = [
  'metas', 'inversiones', 'emergencia', 'ahorro', 'ahorros', 
  'savings', 'investments', 'emergency', 'goals'
]

function classifyCategory(name: string): 'need' | 'want' | 'saving' {
  const lower = name.toLowerCase()
  let type: 'need' | 'want' | 'saving' = 'want'
  
  if (NEEDS_KEYWORDS.some(k => lower.includes(k))) type = 'need'
  else if (SAVINGS_KEYWORDS.some(k => lower.includes(k))) type = 'saving'
  
  console.log(`[Wizard] Clasificada: "${name}" -> ${type.toUpperCase()}`)
  return type
}

export async function generateBudgetProposal(userId: string): Promise<BudgetProposal> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } })
  const currency = settings?.baseCurrency || 'DOP'

  // Last 3 months
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  
  const txs = await prisma.transaction.findMany({
    where: { userId, date: { gte: threeMonthsAgo }, deletedAt: null },
    include: { category: true }
  })

  const incomeTxs = txs.filter(t => t.type === 'INCOME')
  const expenseTxs = txs.filter(t => t.type === 'EXPENSE')

  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0)
  const monthlyIncome = totalIncome / 3 || 0

  const rule = {
    needs: monthlyIncome * 0.5,
    wants: monthlyIncome * 0.3,
    savings: monthlyIncome * 0.2
  }

  // Active Goals
  const allGoals = await prisma.savingsGoal.findMany({ where: { userId } })
  const goals = allGoals.filter(g => g.currentAmount < g.targetAmount)

  const goalsMonthlyRequired = goals.reduce((sum, goal) => {
    const remaining = goal.targetAmount - goal.currentAmount
    if (remaining <= 0 || !goal.deadline) return sum
    
    const diffTime = new Date(goal.deadline).getTime() - new Date().getTime()
    const daysLeft = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
    const monthsLeft = daysLeft / 30
    return sum + (remaining / monthsLeft)
  }, 0)

  let adjustedSavings = rule.savings
  let adjustedNeeds = rule.needs
  let adjustedWants = rule.wants
  const warnings: string[] = []

  if (goalsMonthlyRequired > rule.savings) {
    adjustedSavings = goalsMonthlyRequired
    const deficit = goalsMonthlyRequired - rule.savings
    adjustedWants = Math.max(rule.wants - deficit, rule.needs * 0.5) // Max squeeze
    adjustedNeeds = Math.max(0, monthlyIncome - adjustedSavings - adjustedWants)
    warnings.push(`Tus metas activas requieren ${currency} ${goalsMonthlyRequired.toFixed(2)}/mes de ahorro`)
  }

  // Categories processing
  const existingBudgets = await prisma.budget.findMany({ where: { userId } })
  const categories = await prisma.category.findMany({ where: { OR: [{ userId }, { userId: null }] }})

  // Mapear transacciones por categoria y por mes para avg y max
  const catStats = new Map<string, { monthlyTotals: Map<number, number> }>() // map catId -> month -> total

  for (const t of expenseTxs) {
    if (!t.categoryId) continue
    if (!catStats.has(t.categoryId)) catStats.set(t.categoryId, { monthlyTotals: new Map() })
    const month = new Date(t.date).getMonth()
    const currentTotal = catStats.get(t.categoryId)!.monthlyTotals.get(month) || 0
    catStats.get(t.categoryId)!.monthlyTotals.set(month, currentTotal + t.amount)
  }

  // Encontrar limites ideales por tipo segun # de categorias de ese tipo
  const limitWeights = { need: adjustedNeeds, want: adjustedWants, saving: adjustedSavings }
  
  const allCategories = categories.filter(c => c.name !== 'Income' && c.name !== 'Ingresos')
  const numOfType = {
    need: allCategories.filter(c => classifyCategory(c.name) === 'need').length,
    want: allCategories.filter(c => classifyCategory(c.name) === 'want').length,
    saving: allCategories.filter(c => classifyCategory(c.name) === 'saving').length
  }

  const proposalCategories: BudgetCategoryProposal[] = []

  for (const cat of allCategories) {
    const type = classifyCategory(cat.name)
    const stats = catStats.get(cat.id)
    
    // avg and max calc over 3 months
    let sum = 0, historicalMax = 0
    if (stats) {
      const monthsData = Array.from(stats.monthlyTotals.values())
      for (const val of monthsData) { sum += val; if (val > historicalMax) historicalMax = val }
    }
    const historicalAvg = sum / 3

    const limitPerCat = numOfType[type] > 0 ? limitWeights[type] / numOfType[type] : 0

    let suggested = 0
    let confidence: 'high' | 'medium' | 'low' = 'low'
    let rationale = ''

    if (historicalAvg === 0) {
      suggested = limitPerCat
      confidence = 'low'
      rationale = 'Sin historial — estimado por distribución'
    } else if (historicalAvg <= limitPerCat) {
      suggested = historicalAvg
      confidence = 'high'
      rationale = 'Basado en tu hábito real'
    } else {
      suggested = (historicalAvg + limitPerCat) / 2
      confidence = 'medium'
      rationale = 'Reducción gradual recomendada'
    }

    const existingBudget = existingBudgets.find(b => b.categoryId === cat.id)

    proposalCategories.push({
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      categoryColor: cat.color,
      type,
      historicalAvg,
      historicalMax,
      suggested,
      rationale,
      confidence,
      existingBudget: existingBudget ? { id: existingBudget.id, amount: existingBudget.amount } : undefined
    })
  }

  return {
    monthlyIncome,
    currency,
    rule,
    goalsMonthlyRequired,
    adjustedSavings,
    adjustedNeeds,
    adjustedWants,
    categories: proposalCategories.sort((a,b) => b.historicalAvg - a.historicalAvg),
    warnings
  }
}

export async function applyBudgetProposal(userId: string, categories: { categoryId: string, amount: number, type: string }[]) {
  const fullCategories = await prisma.category.findMany({ where: { id: { in: categories.map(c => c.categoryId) } } })
  
  await Promise.all(
    categories.map(c => {
      const catName = fullCategories.find(fc => fc.id === c.categoryId)?.name || 'Presupuesto'
      return upsertBudget(userId, {
        categoryId: c.categoryId,
        name: catName,
        amount: c.amount
      })
    })
  )

  return { created: categories.length, skipped: 0 }
}
