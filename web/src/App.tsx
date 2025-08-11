import { createRouter, RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { AuthProvider } from './providers/auth-provider.tsx'
import { QueryProvider } from './providers/query-provider.tsx'
import { ThemeProvider } from './providers/theme-provider.tsx'
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

export function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster position="bottom-left" richColors />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}
