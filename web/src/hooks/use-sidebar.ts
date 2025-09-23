import { useRouterState } from '@tanstack/react-router'

import { useNavItems } from '@/routes/navigation'
import { useSidebar as useSidebarContext } from '@/components/ui/sidebar'

export const useSidebar = () => {
  const router = useRouterState()
  const items = useNavItems()
  const route = items.find(r => r.url === router.location.pathname)
  const sidebarContext = useSidebarContext()

  return {
    route,
    ...sidebarContext,
  }
}
