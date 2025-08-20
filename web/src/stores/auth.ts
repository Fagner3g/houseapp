import { redirect } from '@tanstack/react-router'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { GetProfile200User } from '@/http/generated/model'
import { removeAuthToken } from '@/lib/auth'

type Status = 'idle' | 'loading' | 'authed' | 'error'

type AuthState = {
  user: GetProfile200User | null
  status: Status
  setUser: (u: GetProfile200User | null) => void
  setStatus: (s: Status) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      status: 'idle',
      setUser: u => set({ user: u, status: u ? 'authed' : 'idle' }),
      setStatus: s => set({ status: s }),
      logout: () => {
        removeAuthToken()
        set({ user: null, status: 'idle' })
        console.log('logout')
      },
    }),
    { name: 'auth' }
  )
)
