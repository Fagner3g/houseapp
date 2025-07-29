import { env } from '@/env'

export enum Status {
  Pending = 'pending',
  Success = 'success',
  Error = 'error',
}

export interface SiginInRequest {
  email: string
}

export interface SiginInResponse {
  status: Status
}

export async function signIn({ email }: SiginInRequest): Promise<SiginInResponse> {
  const response = await fetch(`${env.VITE_API_HOST}/sign-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    return { status: Status.Error }
  }

  return { status: Status.Success }
}
