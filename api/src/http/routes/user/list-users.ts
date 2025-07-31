import { and, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { db } from '@/database'
import { organizations, userOrganizations } from '@/database/schema'
import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { getUser } from '@/use-cases/user/get-user'
import { listUsers } from '@/use-cases/user/list-users'

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

      const [organization] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1)

      if (!organization) {
        return { users: [] }
      }

      const [membership] = await db
        .select()
        .from(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, userId),
            eq(userOrganizations.organizationId, organization.id)
          )
        )
        .limit(1)

      if (!membership) {
        return { users: [] }
      }

      const { users } = await listUsers({ organizationSlug: slug })

      return { users }
    }
  )
}
