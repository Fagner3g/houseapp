import { db } from '@/db'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import { createOrganization } from '../organization/create-organization'

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
  let organizationId: string | null = null

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      phone,
      avatarUrl: `https://robohash.org/${Math.random().toString(36).slice(2)}?size=200x200`,
    })
    .returning()

  const { organization } = await createOrganization({ name, isFirstOrg: true, ownerId: user.id })
  organizationId = organization.id

  await db.insert(userOrganizations).values({
    userId: user.id,
    organizationId,
  })

  await db.insert(userOrganizations).values({
    userId: user.id,
    organizationId: orgIdInvite,
  })

  await db
    .insert(userOrganizations)
    .values({
      userId: user.id,
      organizationId: orgIdInvite,
    })
    .onConflictDoNothing()

  // TODO:  Send Mail
}
