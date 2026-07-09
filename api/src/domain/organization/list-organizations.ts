import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organizations'
import { organizationMembers } from '@/db/schemas/organizationMembers'

interface ListOrganizations {
  userId: string
}

export async function listOrganizations({ userId }: ListOrganizations) {
  const result = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .innerJoin(organizationMembers, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, userId))

  return { organizations: result }
}
