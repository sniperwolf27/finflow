import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

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

export function useProposal() {
  return useQuery({
    queryKey: ['budgets', 'wizard', 'proposal'],
    queryFn: () => api.get<BudgetProposal>('/budgets/wizard/proposal').then((r) => r.data),
    staleTime: 0, // Siempre fresco / recalculado contra datos del día
  })
}

export function useApplyProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (categories: { categoryId: string; amount: number; type: string }[]) =>
      api.post<{ created: number; skipped: number }>('/budgets/wizard/apply', { categories }).then(r => r.data),
    onSuccess: () => {
      // Invalidar ambas consultas del dashboard de presupuestos
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['budgets', 'progress'] })
    },
  })
}
