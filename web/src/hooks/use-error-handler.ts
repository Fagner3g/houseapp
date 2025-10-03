import { useEffect } from 'react'
import { toast } from 'sonner'

interface ErrorHandlerOptions {
  showToast?: boolean
  customMessage?: string
  onError?: (error: unknown) => void
}

export function useErrorHandler(error: unknown, options: ErrorHandlerOptions = {}) {
  const { showToast = true, customMessage, onError } = options

  useEffect(() => {
    if (!error) return

    let errorMessage = customMessage

    if (!errorMessage) {
      if (error instanceof Error) {
        if (error.name === 'ConnectionError') {
          errorMessage = 'Servidor indisponível. Verifique sua conexão e tente novamente.'
        } else if (error.message.includes('ECONNREFUSED')) {
          errorMessage =
            'Não foi possível conectar ao servidor. Tente novamente em alguns instantes.'
        } else if (error.message.includes('500')) {
          errorMessage = 'Erro interno do servidor. Nossa equipe foi notificada.'
        } else if (error.message.includes('404')) {
          errorMessage = 'Recurso não encontrado.'
        } else if (error.message.includes('403')) {
          errorMessage = 'Você não tem permissão para realizar esta ação.'
        } else {
          errorMessage = error.message || 'Ocorreu um erro inesperado.'
        }
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as { status?: number; message?: string }
        if (errorObj.status === 500) {
          errorMessage = 'Erro interno do servidor. Nossa equipe foi notificada.'
        } else if (errorObj.status === 404) {
          errorMessage = 'Recurso não encontrado.'
        } else if (errorObj.status === 403) {
          errorMessage = 'Você não tem permissão para realizar esta ação.'
        } else {
          errorMessage = 'Ocorreu um erro inesperado.'
        }
      } else {
        errorMessage = 'Ocorreu um erro inesperado.'
      }
    }

    if (showToast && errorMessage) {
      toast.error(errorMessage, {
        duration: 5000,
        action: {
          label: 'Tentar novamente',
          onClick: () => window.location.reload(),
        },
      })
    }

    if (onError) {
      onError(error)
    }
  }, [error, showToast, customMessage, onError])

  return {
    isConnectionError: error instanceof Error && error.name === 'ConnectionError',
    isServerError: error instanceof Error && error.message.includes('500'),
    isNotFoundError: error instanceof Error && error.message.includes('404'),
    isForbiddenError: error instanceof Error && error.message.includes('403'),
  }
}
