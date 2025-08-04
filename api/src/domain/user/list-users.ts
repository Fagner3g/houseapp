import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import { getOrganizationById } from '../organization/get-organization-by-slug'

interface ListUsersByOrg {
  idOrg: string
}

export async function listUsers({ idOrg }: ListUsersByOrg) {
  const { organization } = await getOrganizationById({ idOrg })

  if (!organization) {
    return { users: [] }
  }

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
    .where(eq(userOrganizations.organizationId, organization.id))

  return { users: result }
}
