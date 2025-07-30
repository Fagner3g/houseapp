import { useRouterState } from '@tanstack/react-router'
import { useNavItems } from '@/routes/navigation'

export const useSidebar = () => {
  const router = useRouterState()
  const items = useNavItems()
  const route = items.find(r => r.url === router.location.pathname)

  return {
    route,
  }
}
