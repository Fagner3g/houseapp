import { eq, inArray } from 'drizzle-orm'

import { normalizePhoneDigits, phoneLookupVariants, phonesMatch } from '@/core/phone'
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
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    return result[0]
  }

  if (email) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1)

    return result[0]
  }

  if (phone) {
    const digits = normalizePhoneDigits(phone)
    if (!digits) return undefined

    const variants = phoneLookupVariants(digits)
    const [exact] = await db
      .select()
      .from(users)
      .where(inArray(users.phone, variants))
      .limit(1)

    if (exact) return exact

    const candidates = await db.select().from(users)
    return candidates.find(candidate => phonesMatch(candidate.phone, digits))
  }
}
