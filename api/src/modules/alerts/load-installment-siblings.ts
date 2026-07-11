import { and, eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { transactions } from '@/db/schemas/transactions'
import type { TransactionRecord } from '@/modules/transactions/transaction.repository'

import { filterInstallmentSiblings } from './resolve-whatsapp-alert-amounts'

type InstallmentSiblingAnchor = Pick<
  TransactionRecord,
  | 'id'
  | 'organizationId'
  | 'installmentsTotal'
  | 'accountId'
  | 'cardId'
  | 'title'
  | 'amount'
  | 'installmentNumber'
  | 'date'
  | 'competenceDate'
>

type TransactionAmountInput = Pick<
  TransactionRecord,
  'amount' | 'installmentNumber' | 'installmentsTotal'
>

export async function loadInstallmentSiblingTransactions(
  anchor: InstallmentSiblingAnchor
): Promise<TransactionAmountInput[]> {
  if (anchor.installmentsTotal == null || anchor.installmentsTotal < 2) {
    return [anchor]
  }

  const conditions = [
    eq(transactions.organizationId, anchor.organizationId),
    eq(transactions.installmentsTotal, anchor.installmentsTotal),
  ]

  if (anchor.accountId) {
    conditions.push(eq(transactions.accountId, anchor.accountId))
  } else {
    conditions.push(sql`${transactions.accountId} IS NULL`)
  }

  if (anchor.cardId) {
    conditions.push(eq(transactions.cardId, anchor.cardId))
  } else {
    conditions.push(sql`${transactions.cardId} IS NULL`)
  }

  const candidates = await db
    .select({
      id: transactions.id,
      title: transactions.title,
      organizationId: transactions.organizationId,
      installmentsTotal: transactions.installmentsTotal,
      accountId: transactions.accountId,
      cardId: transactions.cardId,
      amount: transactions.amount,
      installmentNumber: transactions.installmentNumber,
      date: transactions.date,
      competenceDate: transactions.competenceDate,
    })
    .from(transactions)
    .where(and(...conditions))
    .orderBy(transactions.installmentNumber)

  const siblings = filterInstallmentSiblings(candidates, anchor)
  return siblings.length > 0 ? siblings : [anchor]
}
