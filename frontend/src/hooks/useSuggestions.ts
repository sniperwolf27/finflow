import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export interface GoalSuggestion {
  id: string
  type: string
  title: string
  description: string
  categoryId?: string
  targetAmount: number
  monthlySaving: number
  yearlySaving: number
  currentSpend?: number
  suggestedSpend?: number
  confidence: number
  currency: string
  category?: {
    id: string
    name: string
    color: string
    icon: string
  }
}

export function useSuggestions() {
  return useQuery({
    queryKey: ['suggestions'],
    queryFn: () => api.get<GoalSuggestion[]>('/suggestions').then(r => r.data)
  })
}

export function useGenerateSuggestions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<GoalSuggestion[]>('/suggestions/generate').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] })
    }
  })
}

export function useAcceptSuggestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, params }: { id: string, params: { targetAmount?: number, months?: number } }) => 
      api.post(`/suggestions/${id}/accept`, params).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] })
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })
}

export function useDismissSuggestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/suggestions/${id}/dismiss`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] })
    }
  })
}
