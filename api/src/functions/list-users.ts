import { eq } from 'drizzle-orm'

import { db } from '../db'
import { userOrganizations, users } from '../db/schema'

interface ListUsersRequest {
  organizationId: string
}

export async function listUsers({ organizationId }: ListUsersRequest) {
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
    .where(eq(userOrganizations.organizationId, organizationId))

  return { users: result }
}
