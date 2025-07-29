import Cookies from 'universal-cookie'

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

  const request = new Request(path, { ...optinos, headers })
  const response = await fetch(request)

  if (response.ok) {
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json()

      return data as T
    }

    const data = await response.text()
    return data as T
  }

  return Promise.reject(response)
}
