import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetsApi } from '../api/budgets.api'

const QUERY_KEY = ['budgets']
const PROGRESS_KEY = (month?: string) => ['budgets', 'progress', month ?? 'current']

export function useBudgets() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: budgetsApi.list,
  })
}

export function useBudgetProgress(month?: string) {
  return useQuery({
    queryKey: PROGRESS_KEY(month),
    queryFn: () => budgetsApi.getProgress(month),
  })
}

export function useUpsertBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { categoryId: string | null; name: string; amount: number }) =>
      budgetsApi.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['budgets', 'progress'] })
    },
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => budgetsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['budgets', 'progress'] })
    },
  })
}
