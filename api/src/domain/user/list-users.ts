import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'

interface ListUsersByOrg {
  idOrg: string
}

export async function listUsers({ idOrg }: ListUsersByOrg) {
  const result = await db
    .select({
      name: users.name,
      email: users.email,
      phone: users.phone,
      ddd: users.ddd,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
    .where(eq(userOrganizations.organizationId, idOrg))

  return { users: result }
}
