import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { createGoal } from '../../functions/create-goals'

export const createGoalRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/goals',
    {
      schema: {
        tags: ['Goal'],
        description: 'Create a goal',
        body: z.object({
          title: z.string(),
          desiredWeekFrequency: z.number(),
        }),
        response: {
          201: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { desiredWeekFrequency, title } = request.body
      await createGoal({ desiredWeekFrequency, title })

      return reply.status(201).send()
    }
  )
}
