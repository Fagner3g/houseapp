import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { authenticateUserHook } from '../hooks/authenticate-user'

export const validateTokenRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/validate-token',
    {
      schema: {
        onRequest: [authenticateUserHook],
        tags: ['auth'],
        description: 'Validate Token',
        operationId: 'validateToken',
        body: z.object({
          token: z.string(),
        }),
        response: {
          200: z.object({
            valid: z.boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { token } = request.body

      if (!token) {
        return reply.status(401).send({
          valid: false,
        })
      }

      return reply.status(200).send({ valid: true })
    }
  )
}
