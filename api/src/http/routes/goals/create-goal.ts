import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { createGoal } from '@/use-cases/goal/create-goals'

export const createGoalRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/goals',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Goal'],
        description: 'Create a goal',
        operationId: 'createGoal',
        body: z.object({
          title: z.string(),
          desiredWeeklyFrequency: z.number(),
        }),
        response: {
          201: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { desiredWeeklyFrequency, title } = request.body
      const userId = request.user.sub
      await createGoal({ desiredWeeklyFrequency, title, userId })

      return reply.status(201).send()
    }
  )
}
