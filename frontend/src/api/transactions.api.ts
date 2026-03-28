import { api } from './client'
import { Transaction, TransactionFilters, TransactionListResult, TransactionType, CreateTransactionInput } from '../types/transaction.types'

export interface AiParsedTransaction {
  found: boolean
  amount?: number
  currency?: string
  type?: TransactionType
  date?: string
  description?: string
  merchant?: string
  category?: string
  confidence?: number
}

export const transactionsApi = {
  list: (filters: TransactionFilters = {}) =>
    api.get<TransactionListResult>('/transactions', { params: filters }).then((r) => r.data),

  aiParse: (text: string) =>
    api.post<AiParsedTransaction>('/transactions/ai-parse', { text }).then((r) => r.data),

  get: (id: string) =>
    api.get<Transaction>(`/transactions/${id}`).then((r) => r.data),

  create: (data: CreateTransactionInput) => api.post<Transaction>('/transactions', data).then((r) => r.data),

  update: ({ id, ...data }: Partial<Transaction> & { id: string }) =>
    api.patch<Transaction>(`/transactions/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/transactions/${id}`),

  confirm: (id: string) =>
    api.post<Transaction>(`/transactions/${id}/confirm`).then((r) => r.data),

  bulkConfirm: (ids: string[]) =>
    api.post('/transactions/bulk-confirm', { ids }).then((r) => r.data),

  exportCsv: (filters: TransactionFilters = {}) => {
    const params = new URLSearchParams(filters as Record<string, string>)
    window.open(`${import.meta.env.VITE_API_URL || ''}/api/transactions/export?${params}`)
  },
}
