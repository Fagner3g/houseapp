import type { InvoiceStatementLike, TransactionLike } from '@houseapp/finance-core'
import { centavosToString } from '@/core/money'

export type ResidualMetricTransaction = {
  id: string
  accountId: string
  title: string
  amount: bigint | null
  type: 'income' | 'expense' | 'transfer'
  date: Date
  competenceDate: Date | null
  statementId: string | null
  source: string | null
}

export type ResidualStatement = {
  id: string
  accountId: string
  previousBalance: bigint | null
  purchasesTotal: bigint | null
  paymentsReceived: bigint | null
  totalAmount: bigint | null
  isClosed: boolean
  isPaid: boolean
  periodStart: Date | null
  periodEnd: Date | null
  closingDate: Date | null
  dueDate: Date | null
  importSource: string | null
}

function dateKey(value: Date | null | undefined): string | null {
  if (!value) return null
  return value.toISOString().slice(0, 10)
}

function moneyString(value: bigint | null | undefined): string | null {
  if (value == null) return null
  return centavosToString(value)
}

export function toTransactionLike(tx: ResidualMetricTransaction): TransactionLike {
  return {
    title: tx.title,
    amount: moneyString(tx.amount),
    type: tx.type,
    date: dateKey(tx.date) ?? new Date().toISOString().slice(0, 10),
    competenceDate: dateKey(tx.competenceDate),
    statementId: tx.statementId,
    source: tx.source,
  }
}

export function toStatementLike(statement: ResidualStatement): InvoiceStatementLike {
  return {
    id: statement.id,
    previousBalance: moneyString(statement.previousBalance),
    purchasesTotal: moneyString(statement.purchasesTotal),
    paymentsReceived: moneyString(statement.paymentsReceived),
    totalAmount: moneyString(statement.totalAmount),
    isClosed: statement.isClosed,
    isPaid: statement.isPaid,
    periodStart: dateKey(statement.periodStart),
    periodEnd: dateKey(statement.periodEnd),
    dueDate: dateKey(statement.dueDate),
    importSource: statement.importSource,
  }
}

export function residualStatementFromRow(row: {
  id: string
  accountId: string
  previousBalance: bigint | null
  purchasesTotal: bigint | null
  paymentsReceived: bigint | null
  totalAmount: bigint | null
  isClosed: boolean
  isPaid: boolean
  periodStart: Date | null
  periodEnd: Date | null
  closingDate: Date | null
  dueDate: Date | null
  importSource: string | null
}): ResidualStatement {
  return {
    id: row.id,
    accountId: row.accountId,
    previousBalance: row.previousBalance,
    purchasesTotal: row.purchasesTotal,
    paymentsReceived: row.paymentsReceived,
    totalAmount: row.totalAmount,
    isClosed: row.isClosed,
    isPaid: row.isPaid,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    closingDate: row.closingDate,
    dueDate: row.dueDate,
    importSource: row.importSource,
  }
}
