import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { savingsGoalsApi, CreateGoalInput, UpdateGoalInput } from '../api/savings-goals.api'

const QUERY_KEY = ['savings-goals']

export function useSavingsGoals() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: savingsGoalsApi.list,
  })
}

export function useCreateSavingsGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGoalInput) => savingsGoalsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateSavingsGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalInput }) =>
      savingsGoalsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteSavingsGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => savingsGoalsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
