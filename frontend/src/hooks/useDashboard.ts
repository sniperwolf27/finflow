import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api/dashboard.api'

export function useSummary(month?: string) {
  return useQuery({
    queryKey: ['dashboard', 'summary', month],
    queryFn: () => dashboardApi.summary(month),
  })
}

export function useCategoryBreakdown(params?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['dashboard', 'by-category', params],
    queryFn: () => dashboardApi.byCategory(params),
  })
}

export function useMonthlyEvolution(months = 12) {
  return useQuery({
    queryKey: ['dashboard', 'monthly-evolution', months],
    queryFn: () => dashboardApi.monthlyEvolution(months),
  })
}

export function useCashFlow(weeks = 8) {
  return useQuery({
    queryKey: ['dashboard', 'cash-flow', weeks],
    queryFn: () => dashboardApi.cashFlow(weeks),
  })
}

/** Datos diarios para un mes específico (formato YYYY-MM). */
export function useDailyEvolution(month: string) {
  return useQuery({
    queryKey: ['dashboard', 'daily-evolution', month],
    queryFn: () => dashboardApi.dailyEvolution(month),
    enabled: !!month,
  })
}

export function useTopMerchants() {
  return useQuery({
    queryKey: ['dashboard', 'top-merchants'],
    queryFn: dashboardApi.topMerchants,
  })
}
