import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { getUser } from '../../functions/get-user'

export const signInRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/sign-in',
    {
      schema: {
        tags: ['auth'],
        description: 'Sigin In',
        operationId: 'signIn',
        body: z.object({
          email: z.email('E-mail inválido'),
        }),
        response: {
          200: z.object({
            user: z.object({
              name: z.string(),
              email: z.string(),
              phone: z.string(),
              avatarUrl: z.string(),
            }),
          }),
          400: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body

      const resp = await getUser({ email })

      if (!resp) {
        return reply.status(400).send(null)
      }

      return reply.status(200).send({ user: resp.user })
    }
  )
}
