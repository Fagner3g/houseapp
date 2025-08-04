import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schemas/users'

interface GetUserRequest {
  userId?: string
  email?: string
  phone?: string
}

export async function getUser({ userId, email, phone }: GetUserRequest) {
  if (!userId && !email && !phone) {
    throw new Error('Informe um identificador de usuário')
  }

  if (userId) {
    const result = await db.select().from(users).where(eq(users.id, userId))
    return result[0]
  }

  if (email) {
    const result = await db.select().from(users).where(eq(users.email, email))

    return result[0]
  }

  if (phone) {
    const result = await db.select().from(users).where(eq(users.phone, phone))

    return result[0]
  }
}
