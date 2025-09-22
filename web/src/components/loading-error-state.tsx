import { AlertTriangle, Loader2, RefreshCw, WifiOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface LoadingErrorStateProps {
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  title?: string
  description?: string
  children?: React.ReactNode
}

export function LoadingErrorState({
  isLoading = false,
  error,
  onRetry,
  title,
  description,
  children,
}: LoadingErrorStateProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isConnectionError =
      (error instanceof Error && error.name === 'ConnectionError') ||
      (error instanceof Error && error.message.includes('ECONNREFUSED')) ||
      (error instanceof Error && error.message.includes('fetch'))

    const isServerError =
      (error instanceof Error && error.message.includes('500')) ||
      (typeof error === 'object' && error !== null && (error as { status?: number }).status === 500)

    if (isConnectionError) {
      return (
        <Card className="w-full max-w-md mx-auto mt-20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <WifiOff className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-lg">{title || 'Servidor Indisponível'}</CardTitle>
            <CardDescription>
              {description ||
                'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
            )}
          </CardContent>
        </Card>
      )
    }

    if (isServerError) {
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-lg">{title || 'Erro do Servidor'}</CardTitle>
            <CardDescription>
              {description || 'Ocorreu um erro interno do servidor. Nossa equipe foi notificada.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
            )}
          </CardContent>
        </Card>
      )
    }

    // Erro genérico
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-lg">{title || 'Algo deu errado'}</CardTitle>
          <CardDescription>
            {description || 'Ocorreu um erro inesperado. Tente novamente.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
