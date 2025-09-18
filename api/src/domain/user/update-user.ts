import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'

interface UpdateUserInput {
  orgId: string
  email: string
  name?: string
  phone?: string
}

export async function updateUser({ orgId, email, name, phone }: UpdateUserInput) {
  // ensure the user belongs to the org before updating
  const toUpdate = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
    .where(and(eq(userOrganizations.organizationId, orgId), eq(users.email, email)))
    .limit(1)

  if (toUpdate.length === 0) return null

  const userId = toUpdate[0].id

  const values: Partial<typeof users.$inferInsert> = {}
  if (name !== undefined) values.name = name
  if (phone !== undefined) values.phone = phone

  if (Object.keys(values).length === 0) return { ok: true }

  await db.update(users).set(values).where(eq(users.id, userId))

  // return updated basic data along with owner flag
  const [result] = await db
    .select({
      name: users.name,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      isOwner: organizations.ownerId,
    })
    .from(users)
    .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
    .innerJoin(organizations, eq(organizations.id, userOrganizations.organizationId))
    .where(eq(users.id, userId))
    .limit(1)

  return result ?? null
}
