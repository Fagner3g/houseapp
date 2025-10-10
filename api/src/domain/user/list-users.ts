import { asc, eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'

interface ListUsersByOrg {
  idOrg: string
}

export async function listUsers({ idOrg }: ListUsersByOrg) {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      notificationsEnabled: userOrganizations.notificationsEnabled,
      isOwner: sql<boolean>`(${users.id} = (
      SELECT ${organizations.ownerId}
      FROM ${organizations}
      WHERE ${organizations.id} = ${userOrganizations.organizationId}
    ))`.as('isOwner'),
    })

    .from(users)
    .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
    .where(eq(userOrganizations.organizationId, idOrg))
    .orderBy(asc(users.name))

  return { users: result }
}
