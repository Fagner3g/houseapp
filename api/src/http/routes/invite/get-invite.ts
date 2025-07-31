import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { getInvite } from '@/domain/invite/get-invite'

export const getInviteRoute: FastifyPluginAsyncZod = async app => {
  app.get(
    '/invites/:token',
    {
      schema: {
        tags: ['Invite'],
        description: 'Get invite by token',
        operationId: 'getInvite',
        params: z.object({ token: z.string() }),
        response: {
          200: z.object({
            invite: z
              .object({
                id: z.string(),
                email: z.string(),
                organizationId: z.string(),
                organizationSlug: z.string(),
                token: z.string(),
                acceptedAt: z.date().nullish(),
                createdAt: z.date(),
              })
              .nullable(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { token } = request.params
      const { invite } = await getInvite({ token })
      return reply.status(200).send({ invite })
    }
  )
}
