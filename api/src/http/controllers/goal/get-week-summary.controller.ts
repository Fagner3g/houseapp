import type { FastifyRequest } from 'fastify'

import { getWeekSummary } from '@/domain/goal/get-week-summary'

export async function getWeekSummaryController(request: FastifyRequest) {
  const userId = request.user.sub
  const { summary } = await getWeekSummary({ userId })

  return { summary }
}
