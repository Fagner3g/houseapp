import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { createNewUser } from '@/use-cases/user/create-new-user'

export const createNewUserRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/new-user',
    {
      schema: {
        tags: ['auth'],
        description: 'Authenticate with email',
        operationId: 'createNewUser',
        body: z.object({
          ddd: z
            .string()
            .min(2, 'Informe um DDD válido')
            .max(2, 'Informe um DDD válido')
            .regex(/^\d+$/, 'Informe um DDD válido'),
          phone: z
            .string()
            .min(8, 'Informe um telefone válido')
            .max(10, 'Informe um telefone válido'),
          name: z.string('Informe o seu nome'),
          email: z.email('E-mail inválido'),
          inviteToken: z.string().optional(),
        }),
        response: {
          201: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { email, name, phone, ddd, inviteToken } = request.body

      await createNewUser({
        name,
        email,
        phone,
        ddd,
        avatarUrl: `https://robohash.org/${Math.random().toString(36).slice(2)}?size=200x200`,
        inviteToken,
      })

      return reply.status(201).send()
    }
  )
}
