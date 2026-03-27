import { create } from 'zustand'
import { UserProfile } from '../api/auth.api'

interface AuthState {
  user: UserProfile | null
  isLoading: boolean
  setUser: (user: UserProfile | null) => void
  setLoading: (v: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}))
