import { env } from '@/env'

export interface GetSummaryResponse {
  summary: {
    completed: number
    total: number
    goalsPerDay: Record<
      string,
      {
        id: string
        title: string
        createdAt: string
      }[]
    >
  }
}

export async function getSummary(): Promise<GetSummaryResponse> {
  const response = await fetch(`${env.VITE_API_HOST}/summary`)
  const data = await response.json()

  return data
}
