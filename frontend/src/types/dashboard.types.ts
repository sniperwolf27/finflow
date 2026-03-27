export interface DashboardSummary {
  income: number
  expenses: number
  net: number
  currency: string   // dominant currency detected from transactions (e.g. 'DOP', 'USD')
  period: { from: string; to: string }
}

export interface CategoryBreakdown {
  categoryId: string | null
  name: string
  color: string
  icon: string
  total: number
  count: number
}

export interface MonthlyData {
  month: string
  income: number
  expenses: number
  net: number
}

export interface DailyData {
  /** 1–31 */
  day: number
  /** YYYY-MM-DD — solo para mostrar labels */
  date: string
  /**
   * Límite UTC inicio del día — usar ESTE valor como dateFrom al
   * filtrar transacciones. Es el mismo rango que usó el backend
   * para calcular income/expenses, garantizando consistencia total.
   */
  dateFromUtc: string
  /**
   * Límite UTC fin del día — usar ESTE valor como dateTo al
   * filtrar transacciones.
   */
  dateToUtc: string
  income: number
  expenses: number
  net: number
}

export interface CashFlowData {
  week: string
  income: number
  expenses: number
}

export interface TopMerchant {
  merchant: string | null
  total: number
  count: number
}
