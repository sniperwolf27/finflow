const BASE = '/api/savings-goals'

export interface SavingsGoal {
  id: string
  userId: string
  name: string
  emoji: string
  color: string
  targetAmount: number
  currentAmount: number
  currency: string
  deadline: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateGoalInput {
  name: string
  emoji?: string
  color?: string
  targetAmount: number
  currentAmount?: number
  currency?: string
  deadline?: string | null
}

export interface UpdateGoalInput {
  name?: string
  emoji?: string
  color?: string
  targetAmount?: number
  currentAmount?: number
  currency?: string
  deadline?: string | null
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...options })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const savingsGoalsApi = {
  list: () => request<SavingsGoal[]>(BASE),

  create: (data: CreateGoalInput) =>
    request<SavingsGoal>(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateGoalInput) =>
    request<SavingsGoal>(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`${BASE}/${id}`, { method: 'DELETE' }),
}
