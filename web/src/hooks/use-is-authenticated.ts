import { useAuthStore } from '@/stores/auth'

/**
 * Retorna true somente quando:
 * - o estado do auth já foi reidratado do storage (hasHydrated)
 * - existe usuário no store e status === 'authed'
 */
export function useIsAuthenticated(): boolean {
  const hasHydrated = useAuthStore(s => s.hasHydrated)
  const isAuthedRaw = useAuthStore(s => !!s.user && s.status === 'authed')
  return hasHydrated && isAuthedRaw
}

/**
 * Útil para telas/layouts que precisam esperar a hidratação do auth
 * antes de decidir se redirecionam ou renderizam conteúdo protegido.
 */
export function useAuthHydration(): {
  isAuthed: boolean
  hasHydrated: boolean
  isLoading: boolean
} {
  const hasHydrated = useAuthStore(s => s.hasHydrated)
  const isAuthedRaw = useAuthStore(s => !!s.user && s.status === 'authed')
  const isAuthed = hasHydrated && isAuthedRaw
  const isLoading = !hasHydrated
  return { isAuthed, hasHydrated, isLoading }
}
