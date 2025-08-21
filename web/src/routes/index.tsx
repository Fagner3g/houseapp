import { createRouter } from '@tanstack/react-router'

import { routeTree } from '@/routeTree.gen'

export const router = createRouter({
  routeTree,
  notFoundMode: 'root',
})

// Augment do router para tipagem do TanStack Router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
