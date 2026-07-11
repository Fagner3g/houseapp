import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { transactionSplits } from '@/db/schemas/transactionSplits'
import { transactions } from '@/db/schemas/transactions'
import { UNPAID_TRANSACTION_STATUSES } from '@/core/transaction-payment'

export type MarkCyclePurchasesPaidResult = {
  markedIds: string[]
  skippedSplitIds: string[]
}

export function partitionPurchasesForAutoPay(
  candidateIds: string[],
  splitTransactionIds: Iterable<string>
): { toMarkIds: string[]; skippedSplitIds: string[] } {
  const splitIds = new Set(splitTransactionIds)
  const toMarkIds: string[] = []
  const skippedSplitIds: string[] = []

  for (const id of candidateIds) {
    if (splitIds.has(id)) skippedSplitIds.push(id)
    else toMarkIds.push(id)
  }

  return { toMarkIds, skippedSplitIds }
}

function toDateKey(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value.slice(0, 10)
}

/**
 * Marks unpaid cycle expenses as paid. Transactions with any split stay unpaid
 * so collection/settlement stays manual.
 */
export async function markNonSplitCyclePurchasesPaid(params: {
  organizationId: string
  accountId: string
  statementId?: string | null
  periodStart: Date | string
  periodEnd: Date | string
  paidAt?: Date
}): Promise<MarkCyclePurchasesPaidResult> {
  const paidAt = params.paidAt ?? new Date()
  const periodStart = toDateKey(params.periodStart)
  const periodEnd = toDateKey(params.periodEnd)
  const purchaseDate = sql`COALESCE(${transactions.competenceDate}, ${transactions.date})`

  const inPurchaseWindow = and(
    sql`${purchaseDate}::date >= ${periodStart}::date`,
    sql`${purchaseDate}::date <= ${periodEnd}::date`
  )

  const ownership =
    params.statementId != null
      ? or(
          eq(transactions.statementId, params.statementId),
          and(isNull(transactions.statementId), inPurchaseWindow)
        )
      : inPurchaseWindow

  const candidates = await db
    .select({ id: transactions.id, amount: transactions.amount })
    .from(transactions)
    .where(
      and(
        eq(transactions.organizationId, params.organizationId),
        eq(transactions.accountId, params.accountId),
        eq(transactions.type, 'expense'),
        inArray(transactions.status, [...UNPAID_TRANSACTION_STATUSES]),
        ownership
      )
    )

  if (candidates.length === 0) {
    return { markedIds: [], skippedSplitIds: [] }
  }

  const candidateIds = candidates.map(row => row.id)
  const splitRows = await db
    .selectDistinct({ transactionId: transactionSplits.transactionId })
    .from(transactionSplits)
    .where(inArray(transactionSplits.transactionId, candidateIds))

  const { toMarkIds, skippedSplitIds } = partitionPurchasesForAutoPay(
    candidateIds,
    splitRows.map(row => row.transactionId)
  )
  const toMark = candidates.filter(row => toMarkIds.includes(row.id))

  const markedIds: string[] = []
  for (const row of toMark) {
    const [updated] = await db
      .update(transactions)
      .set({
        status: 'paid',
        paidAt,
        paidAmount: row.amount ?? 0n,
        paymentScheduledAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactions.id, row.id),
          eq(transactions.organizationId, params.organizationId),
          inArray(transactions.status, [...UNPAID_TRANSACTION_STATUSES])
        )
      )
      .returning({ id: transactions.id })

    if (updated) markedIds.push(updated.id)
  }

  return { markedIds, skippedSplitIds }
}
