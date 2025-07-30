import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { getWeekPendingGoals } from '@/functions/goal/get-week-pending-goals'
import { authenticateUserHook } from '@/http/hooks/authenticate-user'

export const getPendingGoalsRoute: FastifyPluginAsyncZod = async app => {
  app.get(
    '/pending-goals',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Goal'],
        description: 'get pending goals',
        operationId: 'getPendingGoals',
        response: {
          200: z.object({
            pendingGoals: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                desiredWeekFrequency: z.number(),
                completionCount: z.number(),
                createdAt: z.date(),
              })
            ),
          }),
        },
      },
    },
    async request => {
      const userId = request.user.sub

      const { pendingGoals } = await getWeekPendingGoals({ userId })

      return { pendingGoals }
    }
  )
}
