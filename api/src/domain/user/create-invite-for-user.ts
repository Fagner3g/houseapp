import { db } from '@/db'
import { users } from '@/db/schemas/users'

interface CreateNewUserRequest {
  name: string
  email: string
  phone: string
}

/** Creates a user account only. Org membership is handled by inviteService. */
export async function createForUserInvite({ name, email, phone }: CreateNewUserRequest) {
  const [user] = await db
    .insert(users)
    .values({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone,
      avatarUrl: `https://robohash.org/${Math.random().toString(36).slice(2)}?size=200x200`,
    })
    .returning()

  return user
}
