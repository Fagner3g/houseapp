import { db } from '@/db'
import { organizationMembers } from '@/db/schemas/organizationMembers'
import { users } from '@/db/schemas/users'

// Removido: não criar organização automática ao aceitar convite

interface CreateNewUserRequest {
  name: string
  email: string
  phone: string
  orgIdInvite: string
}

export async function createForUserInvite({
  name,
  email,
  phone,
  orgIdInvite,
}: CreateNewUserRequest) {
  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      phone,
      avatarUrl: `https://robohash.org/${Math.random().toString(36).slice(2)}?size=200x200`,
    })
    .returning()

  await db.insert(organizationMembers).values({
    userId: user.id,
    organizationId: orgIdInvite,
  })

  await db
    .insert(organizationMembers)
    .values({
      userId: user.id,
      organizationId: orgIdInvite,
    })
    .onConflictDoNothing()

  // TODO:  Send Mail
}
