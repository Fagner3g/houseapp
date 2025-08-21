import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { QueryProvider } from './providers/query-provider'
import { ThemeProvider } from './providers/theme-provider'
import { router } from './routes/index'

export function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-left" richColors />
      </QueryProvider>
    </ThemeProvider>
  )
}
