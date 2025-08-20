import { create, type StateCreator } from 'zustand'
import { persist } from 'zustand/middleware'

import type { GetProfile200User } from '@/api/generated/model'
import { removeAuthToken } from '@/lib/auth'

type Status = 'idle' | 'loading' | 'authed' | 'error'

type AuthState = {
  user: GetProfile200User | null
  status: Status
  hasHydrated: boolean
  setUser: (u: GetProfile200User | null) => void
  setStatus: (s: Status) => void
  logout: () => void
}

const store: StateCreator<AuthState> = set => ({
  user: null,
  status: 'idle',
  hasHydrated: false,
  setUser: u => set({ user: u, status: u ? 'authed' : 'idle', hasHydrated: true }),
  setStatus: s => set({ status: s }),
  logout: () => {
    removeAuthToken()
    set({ user: null, status: 'idle' })
  },
})

export const useAuthStore = create<AuthState>()(
  persist(store, {
    name: 'auth',
    partialize: state => ({ user: state.user, status: state.status }),
    onRehydrateStorage: () => {
      return () => {
        const hasUser = useAuthStore.getState().user != null
        useAuthStore.setState({ hasHydrated: true, status: hasUser ? 'authed' : 'idle' })
      }
    },
  })
)

export const useIsAuthenticated = () => useAuthStore(s => !!s.user && s.status === 'authed')
