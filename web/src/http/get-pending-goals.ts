import { env } from '@/env'

export interface GetPendingGoalsResponse {
  pendingGoals: {
    id: string
    title: string
    desiredWeeklyFrequency: number
    completionCount: number
  }[]
}

export async function getPendingGoals(): Promise<GetPendingGoalsResponse> {
  const response = await fetch(`${env.VITE_API_HOST}/pending-goals`)
  const data = await response.json()

  return data
}
