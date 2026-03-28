import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export interface UserSettings {
  id: string
  userId: string
  baseCurrency: string
  updatedAt: string
}

export interface ExchangeRate {
  id: string
  from: string
  to: string
  rate: number
  date: string
  source: string
  isStale: boolean
}

interface SettingsResponse {
  settings: UserSettings
  rates: ExchangeRate[]
}

export function useSettings() {
  return useQuery<SettingsResponse>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(res => res.data),
  })
}

export function useExchangeRates() {
  return useQuery<ExchangeRate[]>({
    queryKey: ['exchange-rates'],
    queryFn: () => api.get('/settings/exchange-rates').then(res => res.data),
  })
}

export function useUpdateCurrency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (currency: string) => api.patch('/settings/currency', { currency }).then(res => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['exchange-rates'] })
      // Forzar recarga completa de finanzas
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useSyncRates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/settings/exchange-rates/sync').then(res => res.data),
    onSuccess: () => {
      // Las tasas se sincronizan async, invalidamos después de 3s
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['settings'] })
        qc.invalidateQueries({ queryKey: ['exchange-rates'] })
      }, 3000)
    },
  })
}

export function useSetManualRate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { from: string; to: string; rate: number }) => 
      api.post('/settings/exchange-rates/manual', data).then(res => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['exchange-rates'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
