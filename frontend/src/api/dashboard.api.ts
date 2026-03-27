import { api } from './client'
import {
  DashboardSummary,
  CategoryBreakdown,
  MonthlyData,
  DailyData,
  CashFlowData,
  TopMerchant,
} from '../types/dashboard.types'

export const dashboardApi = {
  summary: (month?: string) =>
    api.get<DashboardSummary>('/dashboard/summary', { params: month ? { month } : {} }).then((r) => r.data),

  byCategory: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get<CategoryBreakdown[]>('/dashboard/by-category', { params }).then((r) => r.data),

  monthlyEvolution: (months = 12) =>
    api.get<MonthlyData[]>('/dashboard/monthly-evolution', { params: { months } }).then((r) => r.data),

  cashFlow: (weeks = 8) =>
    api.get<CashFlowData[]>('/dashboard/cash-flow', { params: { weeks } }).then((r) => r.data),

  dailyEvolution: (month: string) =>
    api.get<DailyData[]>('/dashboard/daily-evolution', { params: { month } }).then((r) => r.data),

  topMerchants: () =>
    api.get<TopMerchant[]>('/dashboard/top-merchants').then((r) => r.data),
}
