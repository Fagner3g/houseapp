import { asc, eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organizations'
import { organizationMembers } from '@/db/schemas/organizationMembers'
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
      role: organizationMembers.role,
      isOwner: sql<boolean>`(${users.id} = (
      SELECT ${organizations.ownerId}
      FROM ${organizations}
      WHERE ${organizations.id} = ${organizationMembers.organizationId}
    ))`.as('isOwner'),
    })

    .from(users)
    .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, idOrg))
    .orderBy(asc(users.name))

  return { users: result }
}
