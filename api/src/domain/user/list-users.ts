import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { userOrganizations, users } from '@/db/schema'
import { getOrganizationBySlug } from '../organization/get-organization-by-slug'

interface ListUsersRequest {
  organizationSlug: string
}

export async function listUsers({ organizationSlug }: ListUsersRequest) {
  const { organization } = await getOrganizationBySlug({ slug: organizationSlug })

  if (!organization) {
    return { users: [] }
  }
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      ddd: users.ddd,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
    .where(eq(userOrganizations.organizationId, organization.id))

  return { users: result }
}
