const BASE = '/api/budgets'

export interface BudgetCategory {
  id: string
  name: string
  color: string
  icon: string
}

export interface Budget {
  id: string
  name: string
  amount: number
  categoryId: string | null
  category: BudgetCategory | null
  createdAt: string
  updatedAt: string
}

export interface BudgetProgress extends Budget {
  spent: number
  remaining: number
  percent: number
  exceeded: boolean
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...options })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const budgetsApi = {
  list: () => request<Budget[]>(BASE),

  getProgress: (month?: string) =>
    request<BudgetProgress[]>(`${BASE}/progress${month ? `?month=${month}` : ''}`),

  upsert: (data: { categoryId: string | null; name: string; amount: number }) =>
    request<Budget>(BASE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`${BASE}/${id}`, { method: 'DELETE' }),
}
