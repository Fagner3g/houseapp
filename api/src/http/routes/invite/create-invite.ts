import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { createInvite } from '@/functions/invite/create-invite'
import { authenticateUserHook } from '@/http/hooks/authenticate-user'

export const createInviteRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/org/:slug/invites',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Invite'],
        description: 'Create invite to organization',
        operationId: 'createInvite',
        params: z.object({ slug: z.string() }),
        body: z.object({ email: z.string().email() }),
        response: { 201: z.object({ token: z.string() }) },
      },
    },
    async (request, reply) => {
      const { slug } = request.params
      const { email } = request.body
      const { invite } = await createInvite({ email, organizationSlug: slug })
      return reply.status(201).send({ token: invite.token })
    },
  )
}
