import { eq, or, sql, type SQL } from 'drizzle-orm'

import { accounts } from '@/db/schemas/accounts'
import { cards } from '@/db/schemas/cards'
import { transactionSplits } from '@/db/schemas/transactionSplits'
import { transactions } from '@/db/schemas/transactions'

export type TransactionViewer = {
  userId: string
  ownerId: string | null
  isOwner: boolean
}

export function isOrgOwner(userId: string, ownerId: string | null | undefined): boolean {
  return Boolean(ownerId && userId === ownerId)
}

export function toTransactionViewer(
  userId: string,
  ownerId: string | null | undefined
): TransactionViewer {
  return {
    userId,
    ownerId: ownerId ?? null,
    isOwner: isOrgOwner(userId, ownerId),
  }
}

/**
 * Member can see a transaction when they created it, are tagged to notify,
 * are a split debtor, own the linked card, or permanently own the account
 * (creator or assigned card) — covers imported statement rows with null
 * createdBy / cardId.
 */
export function memberVisibleTransactionCondition(userId: string): SQL {
  return or(
    eq(transactions.createdBy, userId),
    eq(transactions.notifyUserId, userId),
    sql`EXISTS (
      SELECT 1 FROM ${transactionSplits}
      WHERE ${transactionSplits.transactionId} = ${transactions.id}
        AND ${transactionSplits.userId} = ${userId}
    )`,
    sql`EXISTS (
      SELECT 1 FROM ${cards}
      WHERE ${cards.id} = ${transactions.cardId}
        AND ${cards.userId} = ${userId}
    )`,
    sql`EXISTS (
      SELECT 1 FROM ${accounts}
      WHERE ${accounts.id} = ${transactions.accountId}
        AND (
          ${accounts.createdBy} = ${userId}
          OR EXISTS (
            SELECT 1 FROM ${cards}
            WHERE ${cards.accountId} = ${accounts.id}
              AND ${cards.userId} = ${userId}
              AND ${cards.status} <> 'canceled'
          )
        )
    )`
  ) as SQL
}

/** Missing viewer skips filtering (system callers); any present viewer is personal. */
export function transactionVisibilityCondition(
  viewer: TransactionViewer | undefined
): SQL | undefined {
  if (!viewer) return undefined
  return memberVisibleTransactionCondition(viewer.userId)
}

/** Full edits (amount, date, status, …). Description/notes are allowed separately in update(). */
export function canMutateTransaction(
  viewer: TransactionViewer,
  createdBy: string | null | undefined
): boolean {
  return createdBy != null && createdBy === viewer.userId
}
