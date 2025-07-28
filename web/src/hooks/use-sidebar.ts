import { useRouterState } from '@tanstack/react-router'

import { data } from '@/routes'

export const useSidebar = () => {
  const router = useRouterState()
  const route = data.navMain.find(route => route.url === router.location.pathname)

  return {
    route,
  }
}
