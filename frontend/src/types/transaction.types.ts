export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER'
export type TransactionSource = 'GMAIL' | 'MANUAL' | 'IMPORT'

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  isDefault: boolean
  userId: string | null
}

export interface Transaction {
  id: string
  userId: string
  amount: number
  originalAmount: number | null
  currency: string
  type: TransactionType
  date: string
  description: string
  merchant: string | null
  notes: string | null
  categoryId: string | null
  category: Category | null
  aiCategory: string | null
  isConfirmed: boolean
  source: TransactionSource
  gmailMessageId: string | null
  contentHash: string
  isDuplicate: boolean
  aiConfidence: number | null
  createdAt: string
  updatedAt: string
}

export interface CreateTransactionInput {
  amount: number
  originalAmount?: number
  currency: string
  type: TransactionType
  date: string
  description: string
  merchant?: string | null
  notes?: string | null
  categoryId?: string | null
}

export interface TransactionListResult {
  total: number
  page: number
  limit: number
  items: Transaction[]
}

export interface UpdateTransactionInput {
  id: string
  amount?: number
  originalAmount?: number
  currency?: string
  type?: TransactionType
  categoryId?: string
  date?: string
  description?: string
  merchant?: string | null
  notes?: string | null
  isConfirmed?: boolean
}

export interface TransactionFilters {
  search?: string
  categoryId?: string
  type?: TransactionType
  dateFrom?: string
  dateTo?: string
  source?: TransactionSource
  isConfirmed?: boolean
  page?: number
  limit?: number
}
