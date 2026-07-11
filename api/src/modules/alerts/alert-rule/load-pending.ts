import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { accounts } from '@/db/schemas/accounts'
import { transactions } from '@/db/schemas/transactions'
import { UNPAID_TRANSACTION_STATUSES } from '@/core/transaction-payment'
import { isNotScheduledForFutureCondition } from '@/modules/transactions/payable-transaction'

import type { PendingTransactionRow } from './types'

export async function loadPendingTransactions(
  organizationId: string
): Promise<PendingTransactionRow[]> {
  return db
    .select({
      id: transactions.id,
      organizationId: transactions.organizationId,
      accountId: transactions.accountId,
      recurringTransactionId: transactions.recurringTransactionId,
      title: transactions.title,
      amount: transactions.amount,
      date: transactions.date,
      competenceDate: transactions.competenceDate,
      type: transactions.type,
      installmentNumber: transactions.installmentNumber,
      accountType: accounts.type,
      closingDay: accounts.closingDay,
      dueDay: accounts.dueDay,
      notifyEnabled: transactions.notifyEnabled,
      notifyTargetType: transactions.notifyTargetType,
      notifyUserId: transactions.notifyUserId,
      notifyContactName: transactions.notifyContactName,
      notifyContactPhone: transactions.notifyContactPhone,
      notifyDaysBefore: transactions.notifyDaysBefore,
      notifyOverdueConfig: transactions.notifyOverdueConfig,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        inArray(transactions.status, [...UNPAID_TRANSACTION_STATUSES]),
        eq(transactions.notifyEnabled, true),
        isNotScheduledForFutureCondition()
      )
    )
}
