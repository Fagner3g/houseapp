import { eq } from 'drizzle-orm'

import { client, db } from '.'
import { users } from './schemas/users'

const TEST_USER_EMAIL = 'fagner.egomes@gmail.com'

function resolveDevPhone(): string | null {
  const raw = process.env.DEV_PHONE_OVERRIDE || process.env.DEV_PHONE
  if (!raw?.trim()) return null

  const digits = raw.replace(/\D/g, '')
  return digits || null
}

async function syncDevPhone() {
  const phone = resolveDevPhone()

  if (!phone) {
    console.error('Defina DEV_PHONE no .env (ex: 31999999999) antes de rodar este comando.')
    process.exitCode = 1
    return
  }

  const [updated] = await db
    .update(users)
    .set({ phone })
    .where(eq(users.email, TEST_USER_EMAIL))
    .returning({ id: users.id, email: users.email, phone: users.phone })

  if (!updated) {
    console.error(`Usuário ${TEST_USER_EMAIL} não encontrado. Rode npm run seed:reset primeiro.`)
    process.exitCode = 1
    return
  }

  console.log(`Telefone sincronizado para ${updated.email}: ${updated.phone}`)
}

void syncDevPhone().finally(() => client.end())
