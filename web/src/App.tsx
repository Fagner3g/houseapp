import { ThemeProvider } from '@/components/theme-provider'
import { Home } from './pages/home'

export function App() {
  return (
    <ThemeProvider>
      <Home />
    </ThemeProvider>
  )
}
