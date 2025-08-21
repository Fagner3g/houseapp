import { createRootRoute, Outlet } from '@tanstack/react-router'

import { NotFoundPage } from './404'

// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      {/* <TanStackRouterDevtools /> */}
    </>
  ),
  notFoundComponent: NotFoundPage,
})
