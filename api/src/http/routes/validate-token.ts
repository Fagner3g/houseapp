import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

export const validateTokenRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/validate-token',
    {
      schema: {
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

      await new Promise(resolve => setTimeout(resolve, 2000))

      return reply.status(200).send({
        valid: true,
      })
    }
  )
}
