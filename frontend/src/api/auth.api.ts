import { api } from './client'

export interface UserProfile {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  gmailConnected: boolean
  lastSyncAt: string | null
}

export const authApi = {
  me: () => api.get<UserProfile>('/auth/me').then((r) => r.data),
  logout: () => api.post('/auth/logout'),
  googleLoginUrl: `${import.meta.env.VITE_API_URL || ''}/api/auth/google`,
}
