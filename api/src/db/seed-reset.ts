import { sql } from 'drizzle-orm'
import slugify from 'slugify'

import { client, db } from '.'
import { organizationMembers } from './schemas/organizationMembers'
import { organizations } from './schemas/organizations'
import { users } from './schemas/users'
import { ensureDefaultCategories } from '@/modules/categories/default-categories'

function resolveDevPhone(): string | null {
  const raw = process.env.DEV_PHONE_OVERRIDE || process.env.DEV_PHONE
  if (!raw?.trim()) return null

  const digits = raw.replace(/\D/g, '')
  return digits || null
}

async function seedReset() {
  await db.execute(sql`
    TRUNCATE TABLE
      "split_payments",
      "transaction_splits",
      "transaction_categories",
      "transaction_attachments",
      "transactions",
      "recurring_transactions",
      "statements",
      "cards",
      "categories",
      "accounts",
      "notifications",
      "alert_rules",
      "invites",
      "organization_members",
      "organizations",
      "users"
    RESTART IDENTITY CASCADE;
  `)

  const devPhone = resolveDevPhone()

  const [user, otherUser, thirdUser] = await db
    .insert(users)
    .values([
      {
        name: 'Fagner Gomes',
        avatarUrl: 'https://github.com/fagner3g.png',
        email: 'fagner.egomes@gmail.com',
        phone: devPhone,
      },
      {
        name: 'Diego Fernandes',
        avatarUrl: 'https://github.com/diego3g.png',
        email: 'diego@gmail.com',
        phone: devPhone,
      },
      {
        name: 'Ana Souza',
        avatarUrl: 'https://example.com/ana.png',
        email: 'ana@gmail.com',
        phone: devPhone,
      },
    ])
    .returning()

  const [org, otherOrg] = await db
    .insert(organizations)
    .values([
      { name: 'Casa', slug: slugify('Casa', { lower: true }), ownerId: user.id },
      { name: 'Work Place', slug: slugify('Work Place', { lower: true }), ownerId: otherUser.id },
    ])
    .returning()

  await db.insert(organizationMembers).values([
    { userId: user.id, organizationId: org.id, role: 'owner' },
    { userId: otherUser.id, organizationId: org.id, role: 'member' },
    { userId: thirdUser.id, organizationId: otherOrg.id, role: 'owner' },
  ])

  await ensureDefaultCategories(org.id)
  await ensureDefaultCategories(otherOrg.id)

  console.log('Seed destrutiva concluída.')
  if (!devPhone) {
    console.log(
      'Aviso: DEV_PHONE não definido — login por WhatsApp não funcionará até configurar DEV_PHONE no .env e rodar npm run seed:sync-dev-phone'
    )
  }
}

seedReset().finally(() => client.end())
