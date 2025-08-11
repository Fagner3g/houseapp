import { toast } from 'sonner'

import { env } from '@/env'
import { getAuthToken, removeAuthToken } from '@/lib/auth'

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
      removeAuthToken()
    }

    if (response.status === 400) {
      const data = await response.json()
      toast.error(data.message)
    }

    if (response.status === 403) {
      const data = await response.json()
      toast.error(data.message)
    }

    if (response.status === 500) {
      const data = await response.json()
      toast.error(data.message)
    }
  }

  return Promise.reject(response)
}
