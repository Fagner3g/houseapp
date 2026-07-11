import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { accounts } from '@/db/schemas/accounts'
import { transactions } from '@/db/schemas/transactions'
import { UNPAID_TRANSACTION_STATUSES } from '@/core/transaction-payment'
import { isNotScheduledForFutureCondition } from '@/modules/transactions/payable-transaction'

import type { ResidualTransaction } from '../owner-residual-alerts'

export async function loadResidualTransactions(
  organizationId: string
): Promise<ResidualTransaction[]> {
  return db
    .select({
      id: transactions.id,
      organizationId: transactions.organizationId,
      accountId: transactions.accountId,
      accountName: accounts.name,
      title: transactions.title,
      amount: transactions.amount,
      paidAmount: transactions.paidAmount,
      date: transactions.date,
      competenceDate: transactions.competenceDate,
      type: transactions.type,
      installmentNumber: transactions.installmentNumber,
      accountType: accounts.type,
      closingDay: accounts.closingDay,
      dueDay: accounts.dueDay,
      notifyEnabled: transactions.notifyEnabled,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.type, 'expense'),
        inArray(transactions.status, [...UNPAID_TRANSACTION_STATUSES]),
        isNotScheduledForFutureCondition()
      )
    )
}
