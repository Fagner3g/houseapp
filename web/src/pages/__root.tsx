import { createRootRoute, Outlet } from '@tanstack/react-router'

import { NotFoundPage } from '../components/not-found-page'

// Toggle to enable/disable devtools
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
