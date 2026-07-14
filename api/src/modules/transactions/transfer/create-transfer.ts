import { and, eq } from 'drizzle-orm'

import { badRequest, forbidden } from '@/core/errors'
import { parseCentavos } from '@/core/money'
import { db } from '@/db'
import { organizations } from '@/db/schemas/organizations'
import { organizationMembers } from '@/db/schemas/organizationMembers'
import type { AccountRepository } from '@/modules/accounts/account.repository'
import {
  toTransactionDto,
  type TransactionDto,
} from '@/modules/transactions/transaction.service'
import type { TransactionRepository } from '@/modules/transactions/transaction.repository'

import type { CreateTransferInput, TransferPairOrg } from './types'

const PAYMENT_ACCOUNT_TYPES = new Set(['checking', 'savings', 'cash'])

export type CreateTransferResult = {
  from: TransactionDto
  to: TransactionDto
}

async function resolveOrgForUser(
  userId: string,
  slug: string
): Promise<TransferPairOrg | null> {
  const [organization] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
    })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1)

  if (!organization) return null

  const [membership] = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organization.id)
      )
    )
    .limit(1)

  if (!membership) return null

  return organization
}

async function getOrganizationName(organizationId: string): Promise<string> {
  const [organization] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  return organization?.name ?? 'Origem'
}

async function assertPaymentAccount(
  accountRepository: AccountRepository,
  organizationId: string,
  accountId: string,
  label: string
) {
  const account = await accountRepository.findById(organizationId, accountId)

  if (!account || !account.isActive) {
    throw badRequest(`${label} account not found`)
  }

  if (!PAYMENT_ACCOUNT_TYPES.has(account.type)) {
    throw badRequest(`${label} account must be checking, savings, or cash`)
  }

  return account
}

export async function createTransfer(params: {
  userId: string
  fromOrganizationId: string
  input: CreateTransferInput
  transactionRepository: TransactionRepository
  accountRepository: AccountRepository
}): Promise<CreateTransferResult> {
  const { userId, fromOrganizationId, input, transactionRepository, accountRepository } =
    params

  const amount = parseCentavos(input.amount)
  if (amount <= 0n) {
    throw badRequest('Amount must be greater than zero')
  }

  const toOrg = await resolveOrgForUser(userId, input.toOrganizationSlug)
  if (!toOrg) {
    throw forbidden('Access denied to destination organization')
  }

  if (input.fromAccountId === input.toAccountId) {
    throw badRequest('Source and destination accounts must be different')
  }

  const fromAccount = await assertPaymentAccount(
    accountRepository,
    fromOrganizationId,
    input.fromAccountId,
    'Source'
  )
  const toAccount = await assertPaymentAccount(
    accountRepository,
    toOrg.id,
    input.toAccountId,
    'Destination'
  )

  const fromOrganizationName = await getOrganizationName(fromOrganizationId)
  const isCrossOrg = toOrg.id !== fromOrganizationId
  const defaultTitle = isCrossOrg
    ? `Transferência: ${fromOrganizationName}/${fromAccount.name} → ${toOrg.name}/${toAccount.name}`
    : `Transferência: ${fromAccount.name} → ${toAccount.name}`
  const title = input.title?.trim() || defaultTitle
  const description = input.description ?? null
  const date = new Date(input.date)

  const { from, to } = await transactionRepository.createTransferPair(
    {
      organizationId: fromOrganizationId,
      accountId: fromAccount.id,
      title,
      description,
      amount,
      type: 'expense',
      date,
      status: 'paid',
      paidAt: date,
      paidAmount: amount,
      source: 'manual',
    },
    {
      organizationId: toOrg.id,
      accountId: toAccount.id,
      title,
      description,
      amount,
      type: 'income',
      date,
      status: 'paid',
      paidAt: date,
      paidAmount: amount,
      source: 'manual',
    }
  )

  return {
    from: toTransactionDto(from),
    to: toTransactionDto(to),
  }
}
