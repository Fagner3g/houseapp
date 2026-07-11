import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { accounts } from '@/db/schemas/accounts'
import { statements } from '@/db/schemas/statements'
import { transactions } from '@/db/schemas/transactions'

import type { ResidualMetricTransaction, ResidualStatement } from '../owner-residual-alerts'

export async function loadCreditCardLedgerByAccount(
  organizationId: string
): Promise<Record<string, ResidualMetricTransaction[]>> {
  const rows = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      title: transactions.title,
      amount: transactions.amount,
      type: transactions.type,
      date: transactions.date,
      competenceDate: transactions.competenceDate,
      statementId: transactions.statementId,
      source: transactions.source,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        eq(accounts.type, 'credit_card'),
        inArray(transactions.type, ['expense', 'income'])
      )
    )

  const byAccount: Record<string, ResidualMetricTransaction[]> = {}
  for (const row of rows) {
    if (!row.accountId) continue
    const list = byAccount[row.accountId] ?? []
    list.push({
      id: row.id,
      accountId: row.accountId,
      title: row.title,
      amount: row.amount,
      type: row.type,
      date: row.date,
      competenceDate: row.competenceDate,
      statementId: row.statementId,
      source: row.source,
    })
    byAccount[row.accountId] = list
  }
  return byAccount
}

export async function loadStatementsByAccount(
  organizationId: string
): Promise<Record<string, ResidualStatement[]>> {
  const rows = await db
    .select({
      id: statements.id,
      accountId: statements.accountId,
      previousBalance: statements.previousBalance,
      purchasesTotal: statements.purchasesTotal,
      paymentsReceived: statements.paymentsReceived,
      totalAmount: statements.totalAmount,
      isClosed: statements.isClosed,
      isPaid: statements.isPaid,
      periodStart: statements.periodStart,
      periodEnd: statements.periodEnd,
      closingDate: statements.closingDate,
      dueDate: statements.dueDate,
      importSource: statements.importSource,
    })
    .from(statements)
    .where(eq(statements.organizationId, organizationId))

  const byAccount: Record<string, ResidualStatement[]> = {}
  for (const row of rows) {
    const list = byAccount[row.accountId] ?? []
    list.push(row)
    byAccount[row.accountId] = list
  }
  return byAccount
}
