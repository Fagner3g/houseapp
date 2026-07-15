import { eq, or, sql, type SQL } from 'drizzle-orm'

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
 * are a split debtor, or own the linked card.
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
    )`
  ) as SQL
}

/** Owners (and missing viewer) skip filtering; members get visibility bound. */
export function transactionVisibilityCondition(
  viewer: TransactionViewer | undefined
): SQL | undefined {
  if (!viewer || viewer.isOwner) return undefined
  return memberVisibleTransactionCondition(viewer.userId)
}

export function canMutateTransaction(
  viewer: TransactionViewer,
  createdBy: string | null | undefined
): boolean {
  if (viewer.isOwner) return true
  return createdBy != null && createdBy === viewer.userId
}
