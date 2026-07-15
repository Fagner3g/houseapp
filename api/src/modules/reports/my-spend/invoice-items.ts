import { and, eq, inArray, sql } from 'drizzle-orm'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

import { db } from '@/db'
import { accounts } from '@/db/schemas/accounts'
import { cards } from '@/db/schemas/cards'
import { transactions } from '@/db/schemas/transactions'
import { getBillingCycle } from '@/core/billing-cycle'
import { userOwnsTransactionCondition } from '@/modules/splits/split-expense-attribution'
import {
  transactionVisibilityCondition,
  type TransactionViewer,
} from '@/modules/transactions/transaction-visibility'

import type { ReportDateRange } from '../report.repository'
import { purchaseDateExpr, reportExpenseAmountExpr } from '../report-spending'
import { myAmountExpr, splitSumExpr, toBigInt } from './expr'
import { monthKeysAround } from './month-keys'
import type { MySpendItemRow } from './types'

dayjs.locale('pt-br')

function isDateInRange(date: string, range: ReportDateRange) {
  const d = dayjs(date)
  return !d.isBefore(dayjs(range.from).startOf('day')) && !d.isAfter(dayjs(range.to).endOf('day'))
}

function shouldIncludeCycle(
  cycle: ReturnType<typeof getBillingCycle>,
  range: ReportDateRange,
  hasPurchasesInFilterRange: boolean
) {
  if (isDateInRange(cycle.dueDate, range)) return true
  if (isDateInRange(cycle.closingDate, range)) return true
  return hasPurchasesInFilterRange
}

async function sumInvoiceCycle(
  organizationId: string,
  userId: string,
  accountId: string,
  periodStart: string,
  periodEnd: string,
  viewer?: TransactionViewer
) {
  const [row] = await db
    .select({
      gross: sql<bigint>`COALESCE(SUM(${reportExpenseAmountExpr}), 0)`,
      splits: sql<bigint>`COALESCE(SUM(${splitSumExpr()}), 0)`,
      myAmount: sql<bigint>`COALESCE(SUM(${myAmountExpr()}), 0)`,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(cards, eq(transactions.cardId, cards.id))
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.accountId, accountId),
        eq(transactions.type, 'expense'),
        inArray(transactions.status, ['paid', 'pending']),
        sql`${purchaseDateExpr} >= ${periodStart}::date`,
        sql`${purchaseDateExpr} <= ${periodEnd}::date`,
        userOwnsTransactionCondition(userId, viewer?.ownerId),
        transactionVisibilityCondition(viewer)
      )
    )

  return {
    gross: toBigInt(row?.gross),
    splits: toBigInt(row?.splits),
    myAmount: toBigInt(row?.myAmount),
  }
}

export async function listInvoiceMySpendItems(
  organizationId: string,
  range: ReportDateRange,
  userId: string,
  ccAccounts: Array<{
    id: string
    name: string
    closingDay: number
    dueDay: number
  }>,
  viewer?: TransactionViewer
): Promise<MySpendItemRow[]> {
  const items: MySpendItemRow[] = []
  const seenInvoices = new Set<string>()

  for (const account of ccAccounts) {
    for (const monthKey of monthKeysAround(range)) {
      const cycle = getBillingCycle(account.closingDay, account.dueDay, monthKey)
      const invoiceKey = `${account.id}-${monthKey}`
      if (seenInvoices.has(invoiceKey)) continue

      const totals = await sumInvoiceCycle(
        organizationId,
        userId,
        account.id,
        cycle.periodStart,
        cycle.periodEnd,
        viewer
      )
      if (totals.gross <= 0n) continue

      const hasPurchasesInFilterRange = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.organizationId, organizationId),
            eq(transactions.accountId, account.id),
            eq(transactions.type, 'expense'),
            inArray(transactions.status, ['paid', 'pending']),
            sql`${purchaseDateExpr} >= ${cycle.periodStart}::date`,
            sql`${purchaseDateExpr} <= ${cycle.periodEnd}::date`,
            sql`${purchaseDateExpr} >= ${range.from.toISOString()}::timestamptz`,
            sql`${purchaseDateExpr} <= ${range.to.toISOString()}::timestamptz`,
            transactionVisibilityCondition(viewer)
          )
        )
        .limit(1)

      if (!shouldIncludeCycle(cycle, range, hasPurchasesInFilterRange.length > 0)) continue

      seenInvoices.add(invoiceKey)
      const label = dayjs(`${monthKey}-01`).format('MMMM [de] YYYY')
      items.push({
        kind: 'invoice',
        id: `invoice-${account.id}-${monthKey}`,
        title: `Fatura ${account.name} — ${label}`,
        subtitle: account.name,
        date: dayjs(cycle.dueDate).hour(12).toDate(),
        accountId: account.id,
        monthKey,
        grossAmount: totals.gross,
        splitAmount: totals.splits,
        myAmount: totals.myAmount,
      })
    }
  }

  return items
}
