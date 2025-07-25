import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { createGoal } from '../../functions/create-goals'

export const createGoalRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/goals',
    {
      schema: {
        body: z.object({
          title: z.string(),
          desiredWeekFrequency: z.number(),
        }),
      },
    },
    async request => {
      const { desiredWeekFrequency, title } = request.body
      await createGoal({ desiredWeekFrequency, title })
    }
  )
}
