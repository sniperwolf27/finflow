import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

// Tipos reflejados desde el backend response
export interface CategoryTrendItem {
  categoryId: string
  categoryName: string
  categoryColor: string
  categoryIcon: string
  months: { month: string; amount: number; transactionCount: number }[]
  trend: 'increasing' | 'decreasing' | 'stable'
  avgMonthly: number
  totalPeriod: number
}

export interface CategoryTrendsResponse {
  categories: CategoryTrendItem[]
  periodMonths: number
}

export interface SavingsTrendMonth {
  month: string
  income: number
  expenses: number
  net: number
  savingsRate: number
  cumulativeNet: number
}

export interface SavingsTrendResponse {
  months: SavingsTrendMonth[]
  avgSavingsRate: number
  bestMonth: { month: string; savingsRate: number } | null
  worstMonth: { month: string; savingsRate: number } | null
  trend: 'improving' | 'declining' | 'stable'
}

export interface SpendingHeatmapResponse {
  byDayOfWeek: { day: string; dayIndex: number; avgAmount: number; total: number; transactionCount: number }[]
  byWeekOfMonth: { week: number; label: string; avgAmount: number; total: number }[]
  peakDay: string | null
  peakWeek: number | null
}

export interface YoYMonth {
  month: string
  monthIndex: number
  currentYear: { income: number; expenses: number; net: number }
  previousYear: { income: number; expenses: number; net: number }
  expenseDelta: number
  incomeDelta: number
  netDelta: number
}

export interface YoYComparisonResponse {
  months: YoYMonth[]
  currentYear: number
  previousYear: number
  summary: { expenseChangeYTD: number; incomeChangeYTD: number; netChangeYTD: number }
}

export interface TopMerchantItem {
  name: string
  totalAmount: number
  transactionCount: number
  avgTransaction: number
  lastTransaction: string
  categoryName: string
  categoryColor: string
  percentOfTotal: number
}

export interface TopMerchantsResponse {
  merchants: TopMerchantItem[]
  totalPeriodExpenses: number
}

const STALE_TIME = 5 * 60 * 1000 // 5 minutos, analytics no cambia segundo a segundo

export const useCategoryTrends = (months: number) =>
  useQuery<CategoryTrendsResponse>({
    queryKey: ['analytics', 'category-trends', months],
    queryFn: () => api.get(`/analytics/category-trends?months=${months}`).then(r => r.data),
    staleTime: STALE_TIME,
  })

export const useSavingsTrend = (months: number) =>
  useQuery<SavingsTrendResponse>({
    queryKey: ['analytics', 'savings-trend', months],
    queryFn: () => api.get(`/analytics/savings-trend?months=${months}`).then(r => r.data),
    staleTime: STALE_TIME,
  })

export const useSpendingHeatmap = (months: number) =>
  useQuery<SpendingHeatmapResponse>({
    queryKey: ['analytics', 'spending-heatmap', months],
    queryFn: () => api.get(`/analytics/spending-heatmap?months=${months}`).then(r => r.data),
    staleTime: STALE_TIME,
  })

export const useYoYComparison = () =>
  useQuery<YoYComparisonResponse>({
    queryKey: ['analytics', 'yoy'],
    queryFn: () => api.get('/analytics/yoy-comparison').then(r => r.data),
    staleTime: STALE_TIME,
  })

export const useTopMerchants = (months: number, limit = 10) =>
  useQuery<TopMerchantsResponse>({
    queryKey: ['analytics', 'merchants', months, limit],
    queryFn: () => api.get(`/analytics/top-merchants?months=${months}&limit=${limit}`).then(r => r.data),
    staleTime: STALE_TIME,
  })

// --- Feature 3: Savings Projection ---

export interface SavingsProjectionMonth {
  month: string
  label: string
  projectedBalance: number
  projectedSavings: number
  savingsRate: number
}

export interface SavingsProjectionGoal {
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
    conservative: SavingsProjectionMonth[]
    current: SavingsProjectionMonth[]
    optimistic: SavingsProjectionMonth[]
  }
  goalProjections: SavingsProjectionGoal[]
}

export const useSavingsProjection = () =>
  useQuery<SavingsProjectionResponse>({ 
    queryKey: ["analytics", "projection"],
    queryFn: () => api.get('/projections/savings').then(r => r.data),
    staleTime: STALE_TIME
  })

