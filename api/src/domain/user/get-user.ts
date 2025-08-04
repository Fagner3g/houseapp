import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schemas/users'

interface GetUserRequest {
  id?: string
  email?: string
  phone?: string
}

export async function getUser({ id, email, phone }: GetUserRequest) {
  if (!id && !email && !phone) {
    throw new Error('Informe um identificador de usuário')
  }

  if (id) {
    const result = await db.select().from(users).where(eq(users.id, id))
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
