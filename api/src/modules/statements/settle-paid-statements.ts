import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { statements } from '@/db/schemas/statements'

import { markNonSplitCyclePurchasesPaid } from './mark-cycle-purchases-paid'

export async function markPurchasesPaidForStatement(params: {
  organizationId: string
  statementId: string
  paidAt?: Date
}): Promise<{ marked: number; skippedSplits: number }> {
  const [statement] = await db
    .select()
    .from(statements)
    .where(
      and(
        eq(statements.id, params.statementId),
        eq(statements.organizationId, params.organizationId)
      )
    )
    .limit(1)

  if (!statement?.periodStart || !statement.periodEnd) {
    return { marked: 0, skippedSplits: 0 }
  }

  const result = await markNonSplitCyclePurchasesPaid({
    organizationId: params.organizationId,
    accountId: statement.accountId,
    statementId: statement.id,
    periodStart: statement.periodStart,
    periodEnd: statement.periodEnd,
    paidAt: params.paidAt ?? statement.dueDate ?? new Date(),
  })

  return { marked: result.markedIds.length, skippedSplits: result.skippedSplitIds.length }
}

/** Idempotent sync for already-paid statements with lingering pending purchases. */
export async function markPurchasesPaidForPaidStatements(
  organizationId: string
): Promise<number> {
  const paidStatements = await db
    .select({ id: statements.id })
    .from(statements)
    .where(and(eq(statements.organizationId, organizationId), eq(statements.isPaid, true)))

  let marked = 0
  for (const row of paidStatements) {
    const result = await markPurchasesPaidForStatement({
      organizationId,
      statementId: row.id,
    })
    marked += result.marked
  }
  return marked
}
