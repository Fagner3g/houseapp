import { and, eq, isNull, ne, or, type SQL } from 'drizzle-orm'

import { cards } from '@/db/schemas/cards'
import { transactionSplits } from '@/db/schemas/transactionSplits'
import { transactions } from '@/db/schemas/transactions'

/** Transaction is attributed to the user as payer (card owner or shared). */
export function userOwnsTransactionCondition(userId: string): SQL {
  return or(
    isNull(transactions.cardId),
    isNull(cards.userId),
    eq(cards.userId, userId)
  )!
}

/** Split is a receivable for the user (they are not the debtor and own the transaction). */
export function userIsSplitCreditorCondition(userId: string): SQL {
  return and(
    or(isNull(transactionSplits.userId), ne(transactionSplits.userId, userId)),
    userOwnsTransactionCondition(userId)
  )!
}
