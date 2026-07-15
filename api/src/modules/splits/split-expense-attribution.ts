import { and, eq, isNotNull, isNull, ne, or, sql, type SQL } from 'drizzle-orm'

import { accounts } from '@/db/schemas/accounts'
import { cards } from '@/db/schemas/cards'
import { transactionSplits } from '@/db/schemas/transactionSplits'
import { transactions } from '@/db/schemas/transactions'

/**
 * Transaction is attributed to the user as payer:
 * - assigned card owner, or
 * - checking / no card: createdBy (legacy null → org owner), or
 * - unassigned card: account.createdBy (legacy null → org owner).
 *
 * Requires leftJoin of `cards` and `accounts` in the query.
 */
export function userOwnsTransactionCondition(
  userId: string,
  ownerId?: string | null
): SQL {
  const isOrgOwner = Boolean(ownerId && ownerId === userId)
  const legacyNullForOwner = isOrgOwner ? isNull(transactions.createdBy) : sql`false`
  const legacyNullAccountForOwner = isOrgOwner ? isNull(accounts.createdBy) : sql`false`

  const ownsChecking = and(
    isNull(transactions.cardId),
    or(eq(transactions.createdBy, userId), legacyNullForOwner)
  )

  const ownsAssignedCard = eq(cards.userId, userId)

  const ownsUnassignedCard = and(
    isNotNull(transactions.cardId),
    isNull(cards.userId),
    or(eq(accounts.createdBy, userId), legacyNullAccountForOwner)
  )

  return or(ownsAssignedCard, ownsChecking, ownsUnassignedCard) as SQL
}

/** Split is a receivable for the user (they are not the debtor and own the transaction). */
export function userIsSplitCreditorCondition(
  userId: string,
  ownerId?: string | null
): SQL {
  return and(
    or(isNull(transactionSplits.userId), ne(transactionSplits.userId, userId)),
    userOwnsTransactionCondition(userId, ownerId)
  ) as SQL
}
