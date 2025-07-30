import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { listOrganizations } from '@/functions/organization/list-organizations'
import { authenticateUserHook } from '@/http/hooks/authenticate-user'

export const listOrganizationsRoute: FastifyPluginAsyncZod = async app => {
  app.get(
    '/organizations',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Organization'],
        description: 'List organizations for authenticated user',
        operationId: 'listOrganizations',
        response: {
          200: z.object({
            organizations: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                slug: z.string(),
                createdAt: z.date(),
              })
            ),
          }),
        },
      },
    },
    async request => {
      const userId = request.user.sub

      const { organizations } = await listOrganizations({ userId })

      return { organizations }
    }
  )
}
