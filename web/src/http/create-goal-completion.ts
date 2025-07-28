import { env } from '@/env'

export interface CreateGoalCompletionRequest {
  goalId: string
}

export async function createGoalCompletion({ goalId }: CreateGoalCompletionRequest): Promise<void> {
  const response = await fetch(`${env.VITE_API_HOST}/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      goalId,
    }),
  })

  if (!response.ok) {
    throw new Error('Error while creating the goal completion')
  }
}
