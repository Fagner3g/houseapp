import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations, userOrganizations } from '@/db/schema'

interface ListOrganizationsRequest {
  userId: string
}

export async function listOrganizations({ userId }: ListOrganizationsRequest) {
  const result = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .innerJoin(userOrganizations, eq(organizations.id, userOrganizations.organizationId))
    .where(eq(userOrganizations.userId, userId))

  return { organizations: result }
}
