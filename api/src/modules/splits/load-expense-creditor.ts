import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { accounts } from '@/db/schemas/accounts'
import { cards } from '@/db/schemas/cards'

import {
  resolveExpenseCreditorUserId,
  type ExpenseCreditorInput,
} from './resolve-expense-creditor'

export type TransactionCreditorFields = {
  cardId: string | null
  accountId: string | null
  createdBy: string | null
}

export async function loadExpenseCreditorUserId(
  transaction: TransactionCreditorFields,
  orgOwnerId: string | null | undefined
): Promise<string | null> {
  let cardUserId: string | null = null
  let accountCreatedBy: string | null = null

  if (transaction.cardId) {
    const [card] = await db
      .select({ userId: cards.userId })
      .from(cards)
      .where(eq(cards.id, transaction.cardId))
      .limit(1)
    cardUserId = card?.userId ?? null
  }

  if (transaction.accountId) {
    const [account] = await db
      .select({ createdBy: accounts.createdBy })
      .from(accounts)
      .where(eq(accounts.id, transaction.accountId))
      .limit(1)
    accountCreatedBy = account?.createdBy ?? null
  }

  const input: ExpenseCreditorInput = {
    cardId: transaction.cardId,
    cardUserId,
    transactionCreatedBy: transaction.createdBy,
    accountCreatedBy,
    orgOwnerId: orgOwnerId ?? null,
  }

  return resolveExpenseCreditorUserId(input)
}
