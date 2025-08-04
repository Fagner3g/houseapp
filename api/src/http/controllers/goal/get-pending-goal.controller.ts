import type { FastifyRequest } from 'fastify'

import { getWeekPendingGoals } from '@/domain/goal/get-week-pending-goals'

export async function getPendingGoalsController(request: FastifyRequest) {
  const userId = request.user.sub

  const { pendingGoals } = await getWeekPendingGoals({ userId })

  return { pendingGoals }
}
