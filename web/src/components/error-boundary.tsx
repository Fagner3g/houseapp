import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Component, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  isConnectionError?: boolean
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: { componentStack: string }) => void
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const isConnectionError =
      error.name === 'ConnectionError' ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('fetch')

    return {
      hasError: true,
      error,
      isConnectionError,
    }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, isConnectionError: false })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, isConnectionError } = this.state

      if (isConnectionError) {
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <WifiOff className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-lg">Servidor Indisponível</CardTitle>
              <CardDescription>
                Não foi possível conectar ao servidor. Verifique sua conexão com a internet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </Button>
                <Button variant="outline" onClick={this.handleReload} className="w-full">
                  <Wifi className="mr-2 h-4 w-4" />
                  Recarregar Página
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      }

      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-lg">Algo deu errado</CardTitle>
            <CardDescription>
              Ocorreu um erro inesperado. Nossa equipe foi notificada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === 'development' && error && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <strong>Erro:</strong> {error.message}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button onClick={this.handleRetry} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
              <Button variant="outline" onClick={this.handleReload} className="w-full">
                Recarregar Página
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
