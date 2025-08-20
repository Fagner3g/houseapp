import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { useGetProfile } from '@/api/generated/api'
import { getAuthToken } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'

export function AuthGate() {
  const navigate = useNavigate()
  const setUser = useAuthStore(s => s.setUser)
  const setStatus = useAuthStore(s => s.setStatus)
  const logout = useAuthStore(s => s.logout)
  const token = getAuthToken()

  const { data, isPending, isError, error } = useGetProfile({
    query: {
      enabled: !!token,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: true,
    },
  })

  useEffect(() => {
    if (isPending) setStatus('loading')
  }, [isPending, setStatus])

  useEffect(() => {
    if (data?.user) {
      setUser(data.user)
      setStatus('authed')
    }
  }, [data, setUser, setStatus])

  useEffect(() => {
    const status = (error as any)?.status ?? (error as any)?.response?.status
    if (isError && status === 401) {
      logout()
      navigate({ to: '/sign-in' })
    } else if (isError) {
      setStatus('error')
    }
  }, [isError, error, logout, navigate, setStatus])

  return null
}
