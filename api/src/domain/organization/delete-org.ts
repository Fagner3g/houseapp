import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'
import { userOrganizations } from '@/db/schemas/userOrganization'

type DeleteOrg = {
  orgId: string
  userId: string
}

export async function deleteOrg({ orgId, userId }: DeleteOrg) {
  await db
    .delete(userOrganizations)
    .where(and(eq(userOrganizations.userId, userId), eq(userOrganizations.organizationId, orgId)))
    .returning()

  await db.delete(organizations).where(eq(organizations.id, orgId))
}
