import dayjs from 'dayjs'
import { and, eq } from 'drizzle-orm'
import slugify from 'slugify'

import { client, db } from '.'
import { accounts } from './schemas/accounts'
import { cards } from './schemas/cards'
import { organizationMembers } from './schemas/organizationMembers'
import { organizations } from './schemas/organizations'
import { transactionCategories } from './schemas/transactionCategories'
import { transactions } from './schemas/transactions'
import { users } from './schemas/users'
import {
  ensureDefaultCategories,
  getCategoryIdByName,
  getOrganizationCategories,
} from '@/modules/categories/default-categories'

const TEST_USER_EMAIL = 'fagner.egomes@gmail.com'
const TEST_USER_PHONE = process.env.DEV_PHONE_OVERRIDE || process.env.DEV_PHONE || null
const TEST_USER_PHONE_VALUE = TEST_USER_PHONE?.replace(/\D/g, '') || null
const TEST_ORG_SLUG = slugify('Casa', { lower: true })

async function ensureUser() {
  const [existing] = await db.select().from(users).where(eq(users.email, TEST_USER_EMAIL))

  if (existing) {
    return existing
  }

  const [created] = await db
    .insert(users)
    .values({
      name: 'Fagner Gomes',
      avatarUrl: 'https://github.com/fagner3g.png',
      email: TEST_USER_EMAIL,
      phone: TEST_USER_PHONE_VALUE,
    })
    .returning()

  return created
}

async function ensureOrganization(userId: string) {
  // Migrate legacy seed slug from rebuild v1
  const [legacy] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, 'my-house'))

  if (legacy && legacy.ownerId === userId) {
    await db
      .update(organizations)
      .set({ slug: TEST_ORG_SLUG, name: 'Casa' })
      .where(eq(organizations.id, legacy.id))
  }

  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, TEST_ORG_SLUG))

  const organization =
    existing ??
    (
      await db
        .insert(organizations)
        .values({
          name: 'Casa',
          slug: TEST_ORG_SLUG,
          ownerId: userId,
        })
        .returning()
    )[0]

  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organization.id)
      )
    )

  if (!membership) {
    await db.insert(organizationMembers).values({
      userId,
      organizationId: organization.id,
      role: 'owner',
    })
  }

  return organization
}

async function seedDemoData() {
  const user = await ensureUser()
  const organization = await ensureOrganization(user.id)

  const existingAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.organizationId, organization.id))

  if (existingAccounts.length > 0) {
    console.log('\nSeed demo já aplicado para esta organização.')
    console.log(`Usuário: ${user.email}`)
    console.log(`Organização: ${organization.slug}`)
    return
  }

  const [nubankAccount, itauAccount, cashAccount] = await db
    .insert(accounts)
    .values([
      {
        organizationId: organization.id,
        name: 'Nubank Ultravioleta',
        type: 'credit_card',
        institution: 'nubank',
        creditLimit: 1500000n,
        closingDay: 1,
        dueDay: 18,
        initialBalance: 0n,
        color: '#7C3AED',
        icon: 'credit-card',
        displayOrder: 0,
      },
      {
        organizationId: organization.id,
        name: 'Conta Corrente Itaú',
        type: 'checking',
        institution: 'itau',
        initialBalance: 850000n,
        pixKey: user.email,
        pixKeyType: 'email',
        color: '#F97316',
        icon: 'landmark',
        displayOrder: 1,
      },
      {
        organizationId: organization.id,
        name: 'Carteira',
        type: 'cash',
        initialBalance: 42000n,
        color: '#10B981',
        icon: 'wallet',
        displayOrder: 2,
      },
    ])
    .returning()

  const [nubankCard] = await db
    .insert(cards)
    .values({
      accountId: nubankAccount.id,
      label: 'Principal',
      lastFourDigits: '4532',
      type: 'physical',
      holderName: user.name,
      brand: 'mastercard',
      status: 'active',
    })
    .returning()

  await ensureDefaultCategories(organization.id)
  const categoryRows = await getOrganizationCategories(organization.id)
  const salaryCategoryId = getCategoryIdByName(
    categoryRows,
    'Salário / Renda Principal',
    'income'
  )
  const mercadoCategoryId = getCategoryIdByName(categoryRows, 'Mercado', 'expense')
  const transporteCategoryId = getCategoryIdByName(
    categoryRows,
    'Transporte (Uber, Combustível)',
    'expense'
  )
  const restaurantesCategoryId = getCategoryIdByName(
    categoryRows,
    'Restaurantes & Delivery',
    'expense'
  )

  const today = dayjs()
  const yesterday = today.subtract(1, 'day')

  const [salaryTx, marketTx, fuelTx, ifoodTx] = await db
    .insert(transactions)
    .values([
      {
        organizationId: organization.id,
        accountId: itauAccount.id,
        title: 'Salário',
        amount: 850000n,
        type: 'income',
        date: yesterday.hour(9).toDate(),
        status: 'paid',
        paidAt: yesterday.hour(9).toDate(),
        paidAmount: 850000n,
        counterparty: 'Empresa',
        source: 'manual',
      },
      {
        organizationId: organization.id,
        accountId: nubankAccount.id,
        cardId: nubankCard.id,
        title: 'Mercado Pão de Açúcar',
        amount: 23400n,
        type: 'expense',
        date: today.hour(12).toDate(),
        status: 'paid',
        paidAt: today.hour(12).toDate(),
        paidAmount: 23400n,
        counterparty: 'Pão de Açúcar',
        source: 'manual',
      },
      {
        organizationId: organization.id,
        accountId: nubankAccount.id,
        cardId: nubankCard.id,
        title: 'Shell Combustível',
        amount: 25000n,
        type: 'expense',
        date: yesterday.hour(18).toDate(),
        status: 'paid',
        paidAt: yesterday.hour(18).toDate(),
        paidAmount: 25000n,
        counterparty: 'Shell',
        source: 'manual',
      },
      {
        organizationId: organization.id,
        accountId: nubankAccount.id,
        cardId: nubankCard.id,
        title: 'iFood',
        amount: 6700n,
        type: 'expense',
        date: today.hour(20).toDate(),
        status: 'pending',
        counterparty: 'iFood',
        source: 'manual',
      },
    ])
    .returning()

  await db.insert(transactionCategories).values([
    { transactionId: salaryTx.id, categoryId: salaryCategoryId },
    { transactionId: marketTx.id, categoryId: mercadoCategoryId },
    { transactionId: fuelTx.id, categoryId: transporteCategoryId },
    { transactionId: ifoodTx.id, categoryId: restaurantesCategoryId },
  ])

  console.log('\nSeed demo aplicada com sucesso.')
  console.log(`Usuário: ${user.email}`)
  console.log(`Organização: ${organization.slug}`)
  console.log('Contas: Nubank (credit_card), Itaú (checking), Carteira (cash)')
  console.log(`Transações: ${4} lançamentos de exemplo`)
}

seedDemoData().finally(() => client.end())
