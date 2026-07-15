import { and, eq } from 'drizzle-orm'
import type { FastifyRequest } from 'fastify'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organizations'
import { organizationMembers } from '@/db/schemas/organizationMembers'

export async function verifyUserBelongsToOrg(request: FastifyRequest, slug: string) {
  const userId = request.user.sub

  const [organization] = await db
    .select({ id: organizations.id, ownerId: organizations.ownerId })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1)

  if (!organization) {
    return null
  }

  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organization.id)
      )
    )
    .limit(1)

  if (!membership) {
    return null
  }

  return {
    id: organization.id,
    ownerId: organization.ownerId,
  }
}
