import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { createOrganization } from '@/use-cases/organization/create-organization'

export const createOrganizationRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/organizations',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Organization'],
        description: 'Create a new organization',
        operationId: 'createOrganization',
        body: z.object({
          name: z.string(),
        }),
        response: {
          201: z.object({
            organizationSlug: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { name } = request.body
      const userId = request.user.sub

      const { organization } = await createOrganization({ name, userId })

      return reply.status(201).send({ organizationSlug: organization.slug })
    }
  )
}
