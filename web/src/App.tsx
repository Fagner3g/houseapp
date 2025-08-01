import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { ThemeProvider } from './components/theme-provider.tsx'
import { OrganizationProvider } from './hooks/use-organization'
// Import the generated route tree
import { routeTree } from './routeTree.gen.ts'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <OrganizationProvider>
          <RouterProvider router={router} />
        </OrganizationProvider>
        <Toaster position="bottom-left" richColors />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
