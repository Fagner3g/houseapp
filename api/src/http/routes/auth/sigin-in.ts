import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { SignIn } from '@/functions/auth/sign-in'

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
          200: z.null(),
          400: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body

      if (!email) {
        return reply.status(400).send(null)
      }

      try {
        await SignIn({ email })
      } catch {
        return reply.status(200).send(null)
      }

      return reply.status(200).send(null)
    }
  )
}
