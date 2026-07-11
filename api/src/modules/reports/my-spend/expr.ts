import { sql } from 'drizzle-orm'

import { transactionSplits } from '@/db/schemas/transactionSplits'
import { transactions } from '@/db/schemas/transactions'

import { reportExpenseAmountExpr } from '../report-spending'

export function splitSumExpr() {
  return sql<bigint>`COALESCE((
    SELECT SUM(${transactionSplits.amount})
    FROM ${transactionSplits}
    WHERE ${transactionSplits.transactionId} = ${transactions.id}
  ), 0)`
}

export function myAmountExpr() {
  return sql<bigint>`GREATEST(${reportExpenseAmountExpr} - ${splitSumExpr()}, 0)`
}

export function toBigInt(value: unknown): bigint {
  if (value == null) return 0n
  if (typeof value === 'bigint') return value
  return BigInt(String(value).split('.')[0] || '0')
}
