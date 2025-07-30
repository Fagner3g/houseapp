import Cookies from 'universal-cookie'

import { env } from '@/env'

async function getHeaders(headers?: HeadersInit): Promise<HeadersInit> {
  const cookies = new Cookies()
  const token = cookies.get('houseapp:token')

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
      const cookies = new Cookies()
      cookies.remove('houseapp:token')
    }
  }

  return Promise.reject(response)
}
