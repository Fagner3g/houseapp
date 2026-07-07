import { useRouterState } from '@tanstack/react-router'

import { useSidebar as useSidebarContext } from '@/components/ui/sidebar'
import { findActiveNavItem } from '@/lib/nav'
import { useNavItems } from '@/routes/navigation'

export const useSidebar = () => {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const items = useNavItems()
  const route =
    findActiveNavItem(pathname, items) ??
    (pathname.endsWith('/profile')
      ? { title: 'Meu Perfil', url: pathname }
      : undefined)
  const sidebarContext = useSidebarContext()

  return {
    route,
    ...sidebarContext,
  }
}
