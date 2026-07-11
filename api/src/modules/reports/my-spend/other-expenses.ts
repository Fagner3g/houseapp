import { and, eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { accounts } from '@/db/schemas/accounts'
import { cards } from '@/db/schemas/cards'
import { transactions } from '@/db/schemas/transactions'
import { userOwnsTransactionCondition } from '@/modules/splits/split-expense-attribution'

import type { ReportDateRange } from '../report.repository'
import { isPayableExpenseInRange, reportExpenseAmountExpr } from '../report-spending'
import { myAmountExpr, splitSumExpr, toBigInt } from './expr'
import type { MySpendItemRow } from './types'

export async function listOtherMySpendItems(
  organizationId: string,
  userId: string,
  range: ReportDateRange
): Promise<MySpendItemRow[]> {
  const rows = await db
    .select({
      transactionId: transactions.id,
      title: transactions.title,
      date: transactions.date,
      gross: reportExpenseAmountExpr,
      splits: splitSumExpr(),
      myAmount: myAmountExpr(),
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(cards, eq(transactions.cardId, cards.id))
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        isPayableExpenseInRange(range),
        userOwnsTransactionCondition(userId),
        sql`${myAmountExpr()} > 0`
      )
    )
    .orderBy(sql`${transactions.date} DESC`, transactions.title)
    .limit(100)

  return rows.map(row => ({
    kind: 'expense' as const,
    id: row.transactionId,
    title: row.title,
    subtitle: null,
    date: row.date,
    accountId: null,
    monthKey: null,
    grossAmount: toBigInt(row.gross),
    splitAmount: toBigInt(row.splits),
    myAmount: toBigInt(row.myAmount),
  }))
}
