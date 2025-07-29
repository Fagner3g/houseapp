import { eq } from 'drizzle-orm'

import { db } from '../db'
import { users } from '../db/schema'

interface GetUserRequest {
  email?: string
  phone?: string
}

export async function getUser({ email, phone }: GetUserRequest) {
  if (!email && !phone) {
    throw new Error('Informe um email ou telefone')
  }

  if (email) {
    const result = await db.select().from(users).where(eq(users.email, email))
    const user = result[0]

    if (!user && phone) {
      const result = await db.select().from(users).where(eq(users.phone, phone))

      if (result.length === 0) {
        throw new Error('Usuário não encontrado')
      }

      const user = result[0]

      return user ? { ...user } : undefined
    }
    return user ? { ...user } : undefined
  }
}
