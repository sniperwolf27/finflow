import { api } from './client'
import { Category } from '../types/transaction.types'

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories').then((r) => r.data),

  create: (data: { name: string; color: string; icon: string }) =>
    api.post<Category>('/categories', data).then((r) => r.data),

  update: (id: string, data: Partial<{ name: string; color: string; icon: string }>) =>
    api.patch<Category>(`/categories/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/categories/${id}`),
}
