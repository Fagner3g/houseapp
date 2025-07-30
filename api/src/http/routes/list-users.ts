import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { listUsers } from '../../functions/list-users'
import { getUser } from '../../functions/get-user'
import { authenticateUserHook } from '../hooks/authenticate-user'

export const listUsersRoute: FastifyPluginAsyncZod = async app => {
  app.get(
    '/users',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['User'],
        description: 'List all users',
        operationId: 'listUsers',
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

      const user = await getUser({ id: userId })

      if (!user) {
        return { users: [] }
      }

      const { users } = await listUsers({ houseId: user.houseId })

      return { users }
    }
  )
}
