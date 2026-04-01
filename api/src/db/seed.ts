import dayjs from 'dayjs'
import { and, eq, inArray } from 'drizzle-orm'
import slugify from 'slugify'

import { client, db } from '.'
import { investmentAssets } from './schemas/investmentAssets'
import { investmentExecutions } from './schemas/investmentExecutions'
import { investmentPlans } from './schemas/investmentPlans'
import { investmentQuotes } from './schemas/investmentQuotes'
import { organizations } from './schemas/organization'
import { userOrganizations } from './schemas/userOrganization'
import { users } from './schemas/users'

const TEST_USER_EMAIL = 'fagner.egomes@gmail.com'
const TEST_USER_PHONE = '5511999999999'
const TEST_ORG_SLUG = slugify('My House', { lower: true })
const TEST_SYMBOLS = ['MXRF11', 'PETR4', 'TESOURO-IPCA-2035']

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
      phone: TEST_USER_PHONE,
    })
    .returning()

  return created
}

async function ensureOrganization(userId: string) {
  const [existing] = await db.select().from(organizations).where(eq(organizations.slug, TEST_ORG_SLUG))

  const organization =
    existing ??
    (
      await db
        .insert(organizations)
        .values({
          name: 'My House',
          slug: TEST_ORG_SLUG,
          ownerId: userId,
        })
        .returning()
    )[0]

  const [membership] = await db
    .select()
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, userId),
        eq(userOrganizations.organizationId, organization.id)
      )
    )

  if (!membership) {
    await db.insert(userOrganizations).values({
      userId,
      organizationId: organization.id,
    })
  }

  return organization
}

async function clearPreviousInvestmentFixture(userId: string) {
  const existingAssets = await db
    .select({ id: investmentAssets.id })
    .from(investmentAssets)
    .where(
      and(eq(investmentAssets.userId, userId), inArray(investmentAssets.symbol, TEST_SYMBOLS))
    )

  const assetIds = existingAssets.map(item => item.id)
  if (assetIds.length === 0) return

  const existingPlans = await db
    .select({ id: investmentPlans.id })
    .from(investmentPlans)
    .where(and(eq(investmentPlans.userId, userId), inArray(investmentPlans.assetId, assetIds)))

  const planIds = existingPlans.map(item => item.id)

  if (planIds.length > 0) {
    await db.delete(investmentExecutions).where(inArray(investmentExecutions.planId, planIds))
    await db.delete(investmentPlans).where(inArray(investmentPlans.id, planIds))
  }

  await db.delete(investmentExecutions).where(inArray(investmentExecutions.assetId, assetIds))
  await db.delete(investmentQuotes).where(inArray(investmentQuotes.assetId, assetIds))
  await db.delete(investmentAssets).where(inArray(investmentAssets.id, assetIds))
}

async function seedInvestments() {
  const user = await ensureUser()
  await ensureOrganization(user.id)
  await clearPreviousInvestmentFixture(user.id)

  const [mxrf, petr, tesouro] = await db
    .insert(investmentAssets)
    .values([
      {
        userId: user.id,
        symbol: 'MXRF11',
        displayName: 'Maxi Renda FII',
        assetClass: 'FII',
        quotePreference: 'auto_with_manual_fallback',
        notes: 'Ativo para testar aportes por valor com progressão linear',
      },
      {
        userId: user.id,
        symbol: 'PETR4',
        displayName: 'Petrobras PN',
        assetClass: 'Ação',
        quotePreference: 'manual',
        notes: 'Ativo para testar aportes por quantidade e cotação manual',
      },
      {
        userId: user.id,
        symbol: 'TESOURO-IPCA-2035',
        displayName: 'Tesouro IPCA 2035',
        assetClass: 'Renda fixa',
        quotePreference: 'manual',
        notes: 'Ativo genérico para testar cadastro fora da bolsa',
      },
    ])
    .returning()

  await db.insert(investmentQuotes).values([
    {
      assetId: mxrf.id,
      source: 'manual',
      price: 1035n,
      capturedAt: dayjs().subtract(1, 'day').toDate(),
    },
    {
      assetId: petr.id,
      source: 'manual',
      price: 3820n,
      capturedAt: dayjs().subtract(1, 'day').toDate(),
    },
    {
      assetId: tesouro.id,
      source: 'manual',
      price: 11420n,
      capturedAt: dayjs().subtract(1, 'day').toDate(),
    },
  ])

  const currentMonthStart = dayjs().startOf('month')
  const previousMonthStart = currentMonthStart.subtract(1, 'month')
  const twoMonthsAgoStart = currentMonthStart.subtract(2, 'month')

  const [mxrfPlan, petrPlan, _tesouroPlan] = await db
    .insert(investmentPlans)
    .values([
      {
        userId: user.id,
        assetId: mxrf.id,
        frequency: 'monthly',
        mode: 'amount',
        progressionType: 'linear_step',
        initialAmount: 1000n,
        stepAmount: 1000n,
        startDate: twoMonthsAgoStart.date(5).toDate(),
        active: true,
      },
      {
        userId: user.id,
        assetId: petr.id,
        frequency: 'monthly',
        mode: 'quantity',
        progressionType: 'linear_step',
        initialQuantity: 1,
        stepQuantity: 1,
        startDate: previousMonthStart.date(10).toDate(),
        active: true,
      },
      {
        userId: user.id,
        assetId: tesouro.id,
        frequency: 'monthly',
        mode: 'amount',
        progressionType: 'fixed',
        initialAmount: 5000n,
        stepAmount: 0n,
        startDate: currentMonthStart.date(15).toDate(),
        active: true,
      },
    ])
    .returning()

  await db.insert(investmentExecutions).values([
    {
      userId: user.id,
      assetId: mxrf.id,
      planId: mxrfPlan.id,
      referenceMonth: twoMonthsAgoStart.format('YYYY-MM'),
      plannedAmount: 1000n,
      plannedQuantity: 0.9804,
      investedAmount: 1000n,
      executedQuantity: 0.98,
      executedUnitPrice: 1020n,
      executedAt: twoMonthsAgoStart.date(5).hour(10).toDate(),
    },
    {
      userId: user.id,
      assetId: mxrf.id,
      planId: mxrfPlan.id,
      referenceMonth: previousMonthStart.format('YYYY-MM'),
      plannedAmount: 2000n,
      plannedQuantity: 1.9512,
      investedAmount: 2000n,
      executedQuantity: 1.95,
      executedUnitPrice: 1025n,
      executedAt: previousMonthStart.date(5).hour(10).toDate(),
    },
    {
      userId: user.id,
      assetId: petr.id,
      planId: petrPlan.id,
      referenceMonth: previousMonthStart.format('YYYY-MM'),
      plannedAmount: 3650n,
      plannedQuantity: 1,
      investedAmount: 3650n,
      executedQuantity: 1,
      executedUnitPrice: 3650n,
      executedAt: previousMonthStart.date(10).hour(11).toDate(),
    },
    {
      userId: user.id,
      assetId: petr.id,
      planId: petrPlan.id,
      referenceMonth: currentMonthStart.format('YYYY-MM'),
      plannedAmount: 7440n,
      plannedQuantity: 2,
      investedAmount: 7440n,
      executedQuantity: 2,
      executedUnitPrice: 3720n,
      executedAt: currentMonthStart.date(10).hour(11).toDate(),
    },
  ])

  console.log('\nSeed segura de investimentos aplicada.')
  console.log(`Usuário de teste: ${user.email}`)
  console.log('A base existente foi preservada.')
  console.log('Somente o fixture de investimentos desse usuário foi recriado.')
}

seedInvestments().finally(() => client.end())
