import { and, eq } from 'drizzle-orm'
import type { FastifyRequest } from 'fastify'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'
import { userOrganizations } from '@/db/schemas/userOrganization'

export async function verifyUserBelongsToOrg(request: FastifyRequest, slug: string) {
  const userId = request.user.sub

  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1)

  if (!organization) {
    return null
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
    return null
  }

  return organization
}
