import { and, eq, isNull, ne, or, type SQL } from 'drizzle-orm'

import { accounts } from '@/db/schemas/accounts'
import { transactions } from '@/db/schemas/transactions'

/** Lançamentos no cartão não são contas a pagar/receber — a obrigação é a fatura. */
export function isPayableTransactionCondition(): SQL {
  return or(
    isNull(transactions.accountId),
    isNull(accounts.type),
    ne(accounts.type, 'credit_card')
  )!
}

export function payableTransactionJoin() {
  return {
    accounts,
    on: eq(transactions.accountId, accounts.id),
  } as const
}

export function payableTransactionWhere(extra?: SQL) {
  return extra ? and(extra, isPayableTransactionCondition()) : isPayableTransactionCondition()
}
