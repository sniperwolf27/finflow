import { api } from './client'

export const gmailApi = {
  status: () =>
    api.get<{ connected: boolean; lastSyncAt: string | null; lastSyncStatus: string | null }>('/gmail/status').then((r) => r.data),

  sync: () => api.post('/gmail/sync').then((r) => r.data),

  history: () =>
    api.get<Array<{
      id: string
      startedAt: string
      completedAt: string | null
      status: string
      emailsScanned: number
      txCreated: number
      txDuplicated: number
    }>>('/gmail/sync/history').then((r) => r.data),

  disconnect: () => api.delete('/gmail/disconnect'),
}
