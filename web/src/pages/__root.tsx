import { createRootRoute, Outlet } from '@tanstack/react-router'

import { AuthGate } from '@/hooks/auth-gete'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <AuthGate />
      <Outlet />
      {/* <TanStackRouterDevtools /> */}
    </>
  ),
})
