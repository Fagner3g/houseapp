import { eq } from 'drizzle-orm'

import { db } from '../db'
import { users } from '../db/schema'

interface ListUsersRequest {
  houseId: string
}

export async function listUsers({ houseId }: ListUsersRequest) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.houseId, houseId))

  return { users: result }
}
