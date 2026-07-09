import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organizations'
import { organizationMembers } from '@/db/schemas/organizationMembers'

type DeleteOrg = {
  orgId: string
  userId: string
}

export async function deleteOrg({ orgId, userId }: DeleteOrg) {
  await db
    .delete(organizationMembers)
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, orgId)))
    .returning()

  await db.delete(organizations).where(eq(organizations.id, orgId))
}
