import { DashboardSummary, CategoryBreakdown, MonthlyData } from '../types/dashboard.types'
import { fmtRound } from './currency'

export type InsightSeverity = 'success' | 'warning' | 'danger' | 'info'

export interface Insight {
  id: string
  severity: InsightSeverity
  icon: string
  title: string
  body: string
  metric?: string
}

export type HealthLevel = 'Buena' | 'Regular' | 'Crítica'

export interface HealthScore {
  level: HealthLevel
  description: string
  spendRatio: number
  scorePercent: number
}

/** @deprecated Usar fmtRound de lib/currency directamente */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return fmtRound(amount, currency)
}

export function computeHealthScore(summary: DashboardSummary | undefined): HealthScore {
  if (!summary || summary.income === 0) {
    return {
      level: 'Crítica',
      description: 'Sin datos de ingresos suficientes para evaluar tu salud financiera.',
      spendRatio: 0,
      scorePercent: 0,
    }
  }

  const spendRatio = summary.expenses / summary.income
  const scorePercent = Math.round(Math.max(0, Math.min(100, ((1.2 - spendRatio) / 1.2) * 100)))

  if (spendRatio < 0.7) {
    return {
      level: 'Buena',
      description: 'Estás gastando menos de lo que ganas. ¡Sigue así!',
      spendRatio,
      scorePercent,
    }
  }

  if (spendRatio < 0.9) {
    return {
      level: 'Regular',
      description: 'Tus gastos se acercan a tus ingresos. Podés mejorar.',
      spendRatio,
      scorePercent,
    }
  }

  return {
    level: 'Crítica',
    description: 'Tus gastos superan o igualan tus ingresos. Revisá tu presupuesto.',
    spendRatio,
    scorePercent,
  }
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  danger: 0,
  warning: 1,
  info: 2,
  success: 3,
}

export function generateInsights(
  summary: DashboardSummary | undefined,
  categories: CategoryBreakdown[] | undefined,
  monthly: MonthlyData[] | undefined,
): Insight[] {
  const insights: Insight[] = []

  // No data guard
  if (!summary && (!categories || categories.length === 0) && (!monthly || monthly.length === 0)) {
    return [
      {
        id: 'no-data',
        severity: 'info',
        icon: '📊',
        title: 'Aún no hay datos suficientes',
        body: 'Agrega más transacciones para ver insights personalizados sobre tus finanzas.',
      },
    ]
  }

  // Rule A: net < 0 → danger
  if (summary && summary.net < 0) {
    insights.push({
      id: 'net-negative',
      severity: 'danger',
      icon: '🔴',
      title: 'Gastaste más de lo que ganaste',
      body: 'Tu balance del período es negativo. Revisá tus gastos.',
      metric: formatCurrency(Math.abs(summary.net)),
    })
  }

  // Rule B: Top category > 30% of total expenses
  if (categories && categories.length > 0) {
    const totalExpenses = categories.reduce((sum, c) => sum + c.total, 0)
    if (totalExpenses > 0) {
      const sorted = [...categories].sort((a, b) => b.total - a.total)
      const topCat = sorted[0]
      const pct = Math.round((topCat.total / totalExpenses) * 100)

      if (pct > 30) {
        insights.push({
          id: 'top-category',
          severity: 'warning',
          icon: '⚠️',
          title: `Tu gasto más alto es ${topCat.name}`,
          body: `Representa el ${pct}% de tus gastos totales del período.`,
          metric: `${pct}%`,
        })
      }

      // Rule F: Subscriptions > 15% of total
      const subscriptionCat = categories.find(
        (c) =>
          c.name.toLowerCase().includes('suscripcion') ||
          c.name.toLowerCase().includes('suscripción') ||
          c.name.toLowerCase().includes('subscription') ||
          c.name.toLowerCase().includes('streaming'),
      )
      if (subscriptionCat) {
        const subPct = Math.round((subscriptionCat.total / totalExpenses) * 100)
        if (subPct > 15) {
          insights.push({
            id: 'subscriptions',
            severity: 'info',
            icon: '📱',
            title: 'Tus suscripciones están subiendo',
            body: `Representan el ${subPct}% de tus gastos. Considerá cancelar las que no usás.`,
            metric: formatCurrency(subscriptionCat.total),
          })
        }
      }
    }
  }

  // Rule C & D: Monthly trend analysis
  if (monthly && monthly.length >= 2) {
    const recent = [...monthly].slice(-6)
    const last = recent[recent.length - 1]
    const prev = recent[recent.length - 2]

    if (prev.expenses > 0) {
      const change = ((last.expenses - prev.expenses) / prev.expenses) * 100

      if (change > 15) {
        insights.push({
          id: 'expenses-up',
          severity: 'warning',
          icon: '📈',
          title: 'Tus gastos subieron este mes',
          body: `Gastaste más que el mes anterior. Revisá en qué categorías aumentaron.`,
          metric: `+${Math.round(change)}%`,
        })
      } else if (change < -15) {
        insights.push({
          id: 'expenses-down',
          severity: 'success',
          icon: '📉',
          title: 'Tus gastos bajaron este mes',
          body: `Lograste reducir tus gastos respecto al mes anterior. ¡Excelente!`,
          metric: `${Math.round(change)}%`,
        })
      }
    }

    // Rule D: Count months with net < 0 in last 6
    const negativeMonths = recent.filter((m) => m.net < 0).length
    if (negativeMonths >= 2) {
      const severity: InsightSeverity = negativeMonths >= 4 ? 'danger' : 'warning'
      insights.push({
        id: 'recurring-deficit',
        severity,
        icon: '🔁',
        title: `${negativeMonths} meses con déficit`,
        body: 'Tuviste más gastos que ingresos en varios meses recientes. Es momento de revisar tu presupuesto.',
        metric: `${negativeMonths}/6 meses`,
      })
    }
  }

  // Rule E: spendRatio < 0.6 → success
  if (summary && summary.income > 0) {
    const spendRatio = summary.expenses / summary.income
    if (spendRatio < 0.6) {
      insights.push({
        id: 'great-savings',
        severity: 'success',
        icon: '🌟',
        title: '¡Excelente! Estás ahorrando bien',
        body: `Guardás más del ${Math.round((1 - spendRatio) * 100)}% de tus ingresos. Seguí así.`,
        metric: formatCurrency(summary.net),
      })
    }
  }

  // Rule G: Categoría que más creció vs promedio de 3 meses previos
  if (monthly && monthly.length >= 4 && categories && categories.length > 0) {
    // Este insight requiere datos de categoría por mes — si el backend los expone,
    // aquí podemos detectar spikes. Por ahora, detectamos si el total de gastos
    // del mes actual supera el promedio de los 3 meses anteriores en >25%.
    const recent3 = monthly.slice(-4, -1) // 3 meses anteriores
    const currentMonth = monthly[monthly.length - 1]
    const avg3 = recent3.reduce((s, m) => s + m.expenses, 0) / recent3.length
    if (avg3 > 0 && currentMonth.expenses > avg3 * 1.25) {
      const spikePercent = Math.round(((currentMonth.expenses - avg3) / avg3) * 100)
      insights.push({
        id: 'expense-spike',
        severity: 'warning',
        icon: '🚨',
        title: `Gastos ${spikePercent}% sobre tu promedio`,
        body: `Este mes gastás ${formatCurrency(currentMonth.expenses - avg3)} más que tu promedio de los últimos 3 meses (${formatCurrency(avg3)}).`,
        metric: `+${spikePercent}%`,
      })
    }
    // Mes positivo por debajo del promedio → ahorro extra
    else if (avg3 > 0 && currentMonth.expenses < avg3 * 0.85) {
      const savePercent = Math.round(((avg3 - currentMonth.expenses) / avg3) * 100)
      insights.push({
        id: 'below-average',
        severity: 'success',
        icon: '💚',
        title: `Gastos ${savePercent}% por debajo de tu promedio`,
        body: `Vas mejor que los últimos 3 meses. Promedio: ${formatCurrency(avg3)}.`,
        metric: `-${savePercent}%`,
      })
    }
  }

  // Rule H: Mes sin ingresos registrados (posible sync pendiente)
  if (summary && summary.income === 0 && summary.expenses > 0) {
    insights.push({
      id: 'no-income',
      severity: 'info',
      icon: '📥',
      title: 'Sin ingresos registrados este período',
      body: 'Tenés gastos pero no ingresos. ¿Falta sincronizar tu correo o agregar ingresos manualmente?',
    })
  }

  // If no insights generated, return a positive info message
  if (insights.length === 0) {
    return [
      {
        id: 'all-good',
        severity: 'info',
        icon: '✅',
        title: 'Todo en orden',
        body: 'Tus finanzas lucen estables. Seguí registrando tus movimientos para obtener más insights.',
      },
    ]
  }

  // Sort: danger → warning → info → success, keep max 5
  return insights
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 5)
}
