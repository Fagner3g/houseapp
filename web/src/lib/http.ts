import { getAuthToken } from '@/lib/auth'
import { env } from '@/lib/env'
import { useAuthStore } from '@/stores/auth'

async function getHeaders(headers?: HeadersInit): Promise<HeadersInit> {
  const token = getAuthToken()

  if (token) {
    return {
      ...headers,
      Authorization: `Bearer ${token}`,
    }
  }
  return { ...headers }
}

export async function http<T>(path: string, optinos: RequestInit): Promise<T> {
  try {
    const headers = await getHeaders(optinos.headers)
    const url = new URL(path, env.VITE_API_HOST)

    const request = new Request(url, { ...optinos, headers })
    const response = await fetch(request)

    if (response.ok) {
      if (response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json()
        return data as T
      }

      const data = await response.text()
      return data as T
    }

    if (!response.ok) {
      if (response.status === 401) {
        useAuthStore.getState().logout()
        return Promise.reject(response)
      }
    }

    return Promise.reject(response)
  } catch (error) {
    // Tratar erros de conexão (ECONNREFUSED, network errors, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const connectionError = new Error(
        'Servidor indisponível. Verifique sua conexão e tente novamente.'
      )
      connectionError.name = 'ConnectionError'
      return Promise.reject(connectionError)
    }

    return Promise.reject(error)
  }
}
