import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { getUser } from '@/functions/user/get-user'
import { listUsers } from '@/functions/user/list-users'
import { authenticateUserHook } from '@/http/hooks/authenticate-user'

export const listUsersRoute: FastifyPluginAsyncZod = async app => {
  app.get(
    '/org/:slug/users',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['User'],
        description: 'List all users in an organization',
        operationId: 'listUsers',
        params: z.object({ slug: z.string() }),
        response: {
          200: z.object({
            users: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                email: z.string(),
                phone: z.string(),
                ddd: z.string(),
                avatarUrl: z.string(),
                createdAt: z.date(),
              })
            ),
          }),
        },
      },
    },
    async request => {
      const userId = request.user.sub
      const { slug } = request.params

      const user = await getUser({ id: userId })

      if (!user) {
        return { users: [] }
      }

      const { users } = await listUsers({ organizationSlug: slug })

      return { users }
    }
  )
}
