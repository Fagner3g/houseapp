import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { acceptInvite } from '@/domain/invite/accept-invite'
import { authenticateUserHook } from '@/http/hooks/authenticate-user'

export const acceptInviteRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/org/:slug/invites/:token/accept',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Invite'],
        description: 'Accept organization invite',
        operationId: 'acceptInvite',
        params: z.object({ slug: z.string(), token: z.string() }),
        response: { 200: z.null() },
      },
    },
    async (request, reply) => {
      const { token } = request.params
      const userId = request.user.sub
      await acceptInvite({ token, userId })
      return reply.status(200).send()
    }
  )
}
