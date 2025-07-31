import { and, eq } from 'drizzle-orm'
import type { FastifyReply } from 'fastify'

import { db } from '@/db'
import { organizations, userOrganizations } from '@/db/schemas/invites'
import type { ListUsersRequest } from '@/http/schemas/user/list-users'
import { getUser } from '@/use-cases/user/get-user'
import { listUsers } from '@/use-cases/user/list-users'

export async function listUsersController(req: ListUsersRequest, reply: FastifyReply) {
  const userId = req.user.sub
  const { slug } = req.params

  const user = await getUser({ id: userId })
  if (!user) {
    return reply.send({ users: [] })
  }

  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1)

  if (!organization) {
    return reply.send({ users: [] })
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
    return reply.send({ users: [] })
  }

  const { users } = await listUsers({ organizationSlug: slug })

  return reply.send({ users })
}
