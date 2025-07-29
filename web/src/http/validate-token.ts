import { env } from '@/env'

export interface ValidateTokenRequest {
  token: string
}

export interface ValidateTokenResponse {
  valid: boolean
}

export async function validateToken({
  token,
}: ValidateTokenRequest): Promise<ValidateTokenResponse> {
  const response = await fetch(`${env.VITE_API_HOST}/validate-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  })
  const data = await response.json()

  return data
}
