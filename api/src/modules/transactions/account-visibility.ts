import { eq, or, sql, type SQL } from 'drizzle-orm'

import { accounts } from '@/db/schemas/accounts'
import { cards } from '@/db/schemas/cards'
import { transactionSplits } from '@/db/schemas/transactionSplits'
import { transactions } from '@/db/schemas/transactions'

import type { TransactionViewer } from './transaction-visibility'

/** Permanent access: member created the account or has an assigned card on it. */
export function memberOwnedAccountCondition(userId: string): SQL {
  return or(
    eq(accounts.createdBy, userId),
    sql`EXISTS (
      SELECT 1 FROM ${cards}
      WHERE ${cards.accountId} = ${accounts.id}
        AND ${cards.userId} = ${userId}
        AND ${cards.status} <> 'canceled'
    )`
  ) as SQL
}

/**
 * Member sees an account when they own it, or have a pending split on a
 * transaction linked to that account (or to a card on that account).
 */
export function memberAccessibleAccountCondition(userId: string): SQL {
  return or(
    memberOwnedAccountCondition(userId),
    sql`EXISTS (
      SELECT 1 FROM ${transactionSplits}
      INNER JOIN ${transactions}
        ON ${transactions.id} = ${transactionSplits.transactionId}
      WHERE ${transactions.accountId} = ${accounts.id}
        AND ${transactionSplits.userId} = ${userId}
        AND ${transactionSplits.status} IN ('pending', 'partial')
    )`,
    sql`EXISTS (
      SELECT 1 FROM ${cards}
      INNER JOIN ${transactions}
        ON ${transactions.cardId} = ${cards.id}
      INNER JOIN ${transactionSplits}
        ON ${transactionSplits.transactionId} = ${transactions.id}
      WHERE ${cards.accountId} = ${accounts.id}
        AND ${cards.status} <> 'canceled'
        AND ${transactionSplits.userId} = ${userId}
        AND ${transactionSplits.status} IN ('pending', 'partial')
    )`
  ) as SQL
}

export type AccountVisibilityOptions = {
  /** When true, only permanent ownership (no temporary split access). */
  ownedOnly?: boolean
}

/** Missing viewer skips filtering (system callers); any present viewer is personal. */
export function accountVisibilityCondition(
  viewer: TransactionViewer | undefined,
  options?: AccountVisibilityOptions
): SQL | undefined {
  if (!viewer) return undefined
  if (options?.ownedOnly) return memberOwnedAccountCondition(viewer.userId)
  return memberAccessibleAccountCondition(viewer.userId)
}

/**
 * Member sees a card when it is assigned to them, belongs to an account they
 * created, or has a pending split on a transaction for that card.
 */
export function memberOwnedCardCondition(userId: string): SQL {
  return or(
    eq(cards.userId, userId),
    sql`EXISTS (
      SELECT 1 FROM ${accounts}
      WHERE ${accounts.id} = ${cards.accountId}
        AND ${accounts.createdBy} = ${userId}
    )`
  ) as SQL
}

export function memberAccessibleCardCondition(userId: string): SQL {
  return or(
    memberOwnedCardCondition(userId),
    sql`EXISTS (
      SELECT 1 FROM ${transactionSplits}
      INNER JOIN ${transactions}
        ON ${transactions.id} = ${transactionSplits.transactionId}
      WHERE ${transactions.cardId} = ${cards.id}
        AND ${transactionSplits.userId} = ${userId}
        AND ${transactionSplits.status} IN ('pending', 'partial')
    )`
  ) as SQL
}

/** Missing viewer skips filtering (system callers); any present viewer is personal. */
export function cardVisibilityCondition(
  viewer: TransactionViewer | undefined,
  options?: AccountVisibilityOptions
): SQL | undefined {
  if (!viewer) return undefined
  if (options?.ownedOnly) return memberOwnedCardCondition(viewer.userId)
  return memberAccessibleCardCondition(viewer.userId)
}
