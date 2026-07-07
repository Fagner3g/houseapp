import { and, asc, count, desc, eq, gte, inArray, lt, lte, or, sql, sum } from 'drizzle-orm'
import dayjs from 'dayjs'

import { db } from '@/db'
import { accounts, type AccountType } from '@/db/schemas/accounts'
import { cards } from '@/db/schemas/cards'
import { categories } from '@/db/schemas/categories'
import { transactionCategories } from '@/db/schemas/transactionCategories'
import { transactionSplits } from '@/db/schemas/transactionSplits'
import { transactions } from '@/db/schemas/transactions'
import { isPayableTransactionCondition } from '@/modules/transactions/payable-transaction'
import { UNPAID_TRANSACTION_STATUSES } from '@/core/transaction-payment'
import {
  userIsSplitCreditorCondition,
  userOwnsTransactionCondition,
} from '@/modules/splits/split-expense-attribution'

import {
  expenseAmountInRangeCase,
  expenseInReportRangeCondition,
  incomeAmountInRangeCase,
  incomeInReportRangeCondition,
  isCreditCardExpenseInRange,
  isInvoicePaymentTitleCondition,
  paidAmountExpr,
  purchaseDateExpr,
  reportDayExpr,
  reportExpenseAmountExpr,
  reportMonthExpr,
} from './report-spending'

export type ReportDateRange = {
  from: Date
  to: Date
}

export type SummaryRow = {
  totalIncome: bigint
  totalExpense: bigint
  myExpenseTotal: bigint
  netWorth: bigint
  pendingCount: number
  overdueCount: number
  pendingSplitsTotal: bigint
  myPendingSplitsTotal: bigint
}

export type UpcomingTransactionRow = {
  id: string
  title: string
  amount: bigint | null
  type: string
  date: Date
  status: string
  accountId: string | null
}

export type AccountReportRow = {
  accountId: string
  name: string
  type: AccountType
  balance: bigint
  income: bigint
  expense: bigint
}

export type CategoryReportRow = {
  categoryId: string
  name: string
  color: string | null
  total: bigint
}

export type CardTransactionReportRow = {
  transactionId: string
  title: string
  amount: bigint
  myAmount: bigint
  purchaseDate: Date
  cardId: string | null
  cardLabel: string | null
  lastFourDigits: string | null
  accountId: string
  accountName: string
}

export type CardTransactionsReportResult = {
  transactions: CardTransactionReportRow[]
  grandTotal: bigint
  myGrandTotal: bigint
}

export type PendingCounterpartyRow = {
  name: string
  amount: bigint
}

export type MonthlyTrendRow = {
  month: string
  income: bigint
  expense: bigint
}

export type DailyReportRow = {
  date: string
  income: bigint
  expense: bigint
}

export interface ReportRepository {
  getSummary(organizationId: string, range: ReportDateRange, userId: string): Promise<SummaryRow>
  listUpcoming(organizationId: string, days: number): Promise<UpcomingTransactionRow[]>
  getByAccount(organizationId: string, range: ReportDateRange): Promise<AccountReportRow[]>
  getByCategory(
    organizationId: string,
    range: ReportDateRange,
    type: 'income' | 'expense'
  ): Promise<CategoryReportRow[]>
  getByCard(organizationId: string, range: ReportDateRange): Promise<CardTransactionsReportResult>
  listTopPending(
    organizationId: string,
    type: 'income' | 'expense',
    limit: number
  ): Promise<PendingCounterpartyRow[]>
  getOverdueTotal(organizationId: string): Promise<bigint>
  getTrends(organizationId: string, months: number, endMonth?: string): Promise<MonthlyTrendRow[]>
  getDaily(organizationId: string, range: ReportDateRange): Promise<DailyReportRow[]>
}

function toBigInt(value: unknown): bigint {
  if (value == null) return 0n
  if (typeof value === 'bigint') return value
  return BigInt(String(value).split('.')[0] || '0')
}

function balanceDeltaExpr() {
  return sql<bigint>`CASE
    WHEN ${transactions.status} = 'paid' AND ${transactions.type} = 'income' THEN ${paidAmountExpr}
    WHEN ${transactions.status} = 'paid' AND ${transactions.type} = 'expense' THEN -${paidAmountExpr}
    ELSE 0
  END`
}

function accountPeriodIncomeCase(range: ReportDateRange) {
  return sql<bigint>`COALESCE(SUM(CASE
    WHEN ${transactions.type} = 'income'
      AND ${transactions.status} = 'paid'
      AND ${transactions.date} >= ${range.from.toISOString()}::timestamptz
      AND ${transactions.date} <= ${range.to.toISOString()}::timestamptz
      AND ${accounts.type} IS DISTINCT FROM 'credit_card'
    THEN ${paidAmountExpr}
    ELSE 0
  END), 0)`
}

function accountPeriodExpenseCase(range: ReportDateRange) {
  return sql<bigint>`COALESCE(SUM(CASE
    WHEN ${transactions.type} = 'expense'
      AND ${accounts.type} = 'credit_card'
      AND ${transactions.status} IN ('paid', 'pending')
      AND ${purchaseDateExpr} >= ${range.from.toISOString()}::timestamptz
      AND ${purchaseDateExpr} <= ${range.to.toISOString()}::timestamptz
    THEN ${reportExpenseAmountExpr}
    WHEN ${transactions.type} = 'expense'
      AND ${transactions.status} = 'paid'
      AND ${accounts.type} IS DISTINCT FROM 'credit_card'
      AND ${transactions.date} >= ${range.from.toISOString()}::timestamptz
      AND ${transactions.date} <= ${range.to.toISOString()}::timestamptz
      AND NOT (${isInvoicePaymentTitleCondition()})
    THEN ${reportExpenseAmountExpr}
    ELSE 0
  END), 0)`
}

export class DrizzleReportRepository implements ReportRepository {
  async getSummary(
    organizationId: string,
    range: ReportDateRange,
    userId: string
  ): Promise<SummaryRow> {
    const todayStart = dayjs().startOf('day').toDate()

    const [incomeRow] = await db
      .select({ total: sum(incomeAmountInRangeCase(range)) })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(eq(transactions.organizationId, organizationId))

    const [expenseRow] = await db
      .select({ total: sum(expenseAmountInRangeCase(range)) })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(eq(transactions.organizationId, organizationId))

    const expenseOwnerConditions = and(
      expenseInReportRangeCondition(range),
      userOwnsTransactionCondition(userId)
    )

    const [myExpenseRow] = await db
      .select({ total: sum(reportExpenseAmountExpr) })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .where(and(eq(transactions.organizationId, organizationId), expenseOwnerConditions))

    const [mySplitsRow] = await db
      .select({
        total: sql<bigint>`COALESCE(SUM(${transactionSplits.amount}), 0)`,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .where(and(eq(transactions.organizationId, organizationId), expenseOwnerConditions))

    const myExpenseGross = toBigInt(myExpenseRow?.total)
    const mySplitsInPeriod = toBigInt(mySplitsRow?.total)
    const myExpenseTotal =
      myExpenseGross > mySplitsInPeriod ? myExpenseGross - mySplitsInPeriod : 0n

    const [pendingRow] = await db
      .select({ total: count() })
      .from(transactions)
      .where(
        and(eq(transactions.organizationId, organizationId), inArray(transactions.status, [...UNPAID_TRANSACTION_STATUSES]))
      )

    const [overdueRow] = await db
      .select({ total: count() })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactions.status, [...UNPAID_TRANSACTION_STATUSES]),
          lt(transactions.date, todayStart),
          isPayableTransactionCondition()
        )
      )

    const accountRows = await this.getByAccount(organizationId, range)
    const netWorth = accountRows.reduce((sumBalance, row) => sumBalance + row.balance, 0n)

    const [splitsRow] = await db
      .select({
        pendingSplitsTotal: sql<bigint>`COALESCE(SUM(${transactionSplits.amount} - ${transactionSplits.paidAmount}), 0)`,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactionSplits.status, ['pending', 'partial'])
        )
      )

    const [myPendingSplitsRow] = await db
      .select({
        myPendingSplitsTotal: sql<bigint>`COALESCE(SUM(${transactionSplits.amount} - ${transactionSplits.paidAmount}), 0)`,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactionSplits.status, ['pending', 'partial']),
          userIsSplitCreditorCondition(userId)
        )
      )

    return {
      totalIncome: toBigInt(incomeRow?.total),
      totalExpense: toBigInt(expenseRow?.total),
      myExpenseTotal,
      netWorth,
      pendingCount: pendingRow?.total ?? 0,
      overdueCount: overdueRow?.total ?? 0,
      pendingSplitsTotal: toBigInt(splitsRow?.pendingSplitsTotal),
      myPendingSplitsTotal: toBigInt(myPendingSplitsRow?.myPendingSplitsTotal),
    }
  }

  async listUpcoming(organizationId: string, days: number): Promise<UpcomingTransactionRow[]> {
    const todayStart = dayjs().startOf('day').toDate()
    const until = dayjs().add(days, 'day').endOf('day').toDate()

    return db
      .select({
        id: transactions.id,
        title: transactions.title,
        amount: transactions.amount,
        type: transactions.type,
        date: transactions.date,
        status: transactions.status,
        accountId: transactions.accountId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactions.status, [...UNPAID_TRANSACTION_STATUSES]),
          gte(transactions.date, todayStart),
          lte(transactions.date, until)
        )
      )
      .orderBy(asc(transactions.date), asc(transactions.title))
  }

  async getByAccount(organizationId: string, range: ReportDateRange): Promise<AccountReportRow[]> {
    const delta = balanceDeltaExpr()

    const rows = await db
      .select({
        accountId: accounts.id,
        name: accounts.name,
        type: accounts.type,
        balance: sql<bigint>`${accounts.initialBalance} + COALESCE(SUM(${delta}), 0)`,
        income: accountPeriodIncomeCase(range),
        expense: accountPeriodExpenseCase(range),
      })
      .from(accounts)
      .leftJoin(transactions, eq(transactions.accountId, accounts.id))
      .where(and(eq(accounts.organizationId, organizationId), eq(accounts.isActive, true)))
      .groupBy(
        accounts.id,
        accounts.name,
        accounts.type,
        accounts.initialBalance,
        accounts.displayOrder
      )
      .orderBy(accounts.displayOrder, accounts.name)

    return rows.map(row => ({
      ...row,
      balance: toBigInt(row.balance),
      income: toBigInt(row.income),
      expense: toBigInt(row.expense),
    }))
  }

  async getByCategory(
    organizationId: string,
    range: ReportDateRange,
    type: 'income' | 'expense'
  ): Promise<CategoryReportRow[]> {
    const rangeCondition =
      type === 'expense' ? expenseInReportRangeCondition(range) : incomeInReportRangeCondition(range)
    const amountExpr = type === 'expense' ? reportExpenseAmountExpr : paidAmountExpr

    const rows = await db
      .select({
        categoryId: categories.id,
        name: categories.name,
        color: categories.color,
        total: sql<bigint>`COALESCE(SUM(${amountExpr}), 0)`,
      })
      .from(categories)
      .innerJoin(transactionCategories, eq(transactionCategories.categoryId, categories.id))
      .innerJoin(transactions, eq(transactionCategories.transactionId, transactions.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(categories.organizationId, organizationId),
          eq(categories.isActive, true),
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, type),
          rangeCondition
        )
      )
      .groupBy(categories.id, categories.name, categories.color)
      .orderBy(sql`COALESCE(SUM(${amountExpr}), 0) DESC`, categories.name)

    return rows.map(row => ({
      ...row,
      total: toBigInt(row.total),
    }))
  }

  async getByCard(
    organizationId: string,
    range: ReportDateRange
  ): Promise<CardTransactionsReportResult> {
    const splitSumExpr = sql<bigint>`COALESCE((
      SELECT SUM(${transactionSplits.amount})
      FROM ${transactionSplits}
      WHERE ${transactionSplits.transactionId} = ${transactions.id}
    ), 0)`
    const myAmountExpr = sql<bigint>`GREATEST(${reportExpenseAmountExpr} - ${splitSumExpr}, 0)`
    const cardExpenseWhere = and(
      eq(transactions.organizationId, organizationId),
      isCreditCardExpenseInRange(range)
    )

    const [totalsRow] = await db
      .select({
        grandTotal: sql<bigint>`COALESCE(SUM(${reportExpenseAmountExpr}), 0)`,
        myGrandTotal: sql<bigint>`COALESCE(SUM(${myAmountExpr}), 0)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(cardExpenseWhere)

    const rows = await db
      .select({
        transactionId: transactions.id,
        title: transactions.title,
        amount: reportExpenseAmountExpr,
        myAmount: myAmountExpr,
        purchaseDate: purchaseDateExpr,
        cardId: cards.id,
        cardLabel: cards.label,
        lastFourDigits: cards.lastFourDigits,
        accountId: accounts.id,
        accountName: accounts.name,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .where(cardExpenseWhere)
      .orderBy(desc(reportExpenseAmountExpr), asc(transactions.title))
      .limit(10)

    return {
      transactions: rows.map(row => ({
        transactionId: row.transactionId,
        title: row.title,
        amount: toBigInt(row.amount),
        myAmount: toBigInt(row.myAmount),
        purchaseDate: row.purchaseDate,
        cardId: row.cardId,
        cardLabel: row.cardLabel,
        lastFourDigits: row.lastFourDigits,
        accountId: row.accountId,
        accountName: row.accountName,
      })),
      grandTotal: toBigInt(totalsRow?.grandTotal),
      myGrandTotal: toBigInt(totalsRow?.myGrandTotal),
    }
  }

  async listTopPending(
    organizationId: string,
    type: 'income' | 'expense',
    limit: number
  ): Promise<PendingCounterpartyRow[]> {
    const rows = await db
      .select({
        name: transactions.title,
        amount: sql<bigint>`COALESCE(${transactions.amount}, 0)`,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, type),
          inArray(transactions.status, [...UNPAID_TRANSACTION_STATUSES]),
          isPayableTransactionCondition()
        )
      )
      .orderBy(sql`COALESCE(${transactions.amount}, 0) DESC`, transactions.title)
      .limit(limit)

    return rows.map(row => ({
      name: row.name,
      amount: toBigInt(row.amount),
    }))
  }

  async getOverdueTotal(organizationId: string): Promise<bigint> {
    const todayStart = dayjs().startOf('day').toDate()

    const [row] = await db
      .select({ total: sum(sql<bigint>`COALESCE(${transactions.amount}, 0)`) })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactions.status, [...UNPAID_TRANSACTION_STATUSES]),
          lt(transactions.date, todayStart),
          isPayableTransactionCondition()
        )
      )

    return toBigInt(row?.total)
  }

  async getTrends(
    organizationId: string,
    months: number,
    endMonth?: string
  ): Promise<MonthlyTrendRow[]> {
    const count = Math.min(Math.max(months, 1), 24)
    const anchor = endMonth ? dayjs(`${endMonth}-01`) : dayjs()
    const startMonth = anchor.subtract(count - 1, 'month').startOf('month').toDate()
    const endMonthDate = anchor.endOf('month').toDate()
    const range = { from: startMonth, to: endMonthDate }
    const monthExpr = reportMonthExpr()

    const rows = await db
      .select({
        month: monthExpr,
        income: sql<bigint>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${paidAmountExpr} ELSE 0 END), 0)`,
        expense: sql<bigint>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${reportExpenseAmountExpr} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          or(
            incomeInReportRangeCondition(range),
            expenseInReportRangeCondition(range)
          )
        )
      )
      .groupBy(monthExpr)
      .orderBy(monthExpr)

    const byMonth = new Map(
      rows.map(row => [
        row.month,
        { income: toBigInt(row.income), expense: toBigInt(row.expense) },
      ])
    )

    const result: MonthlyTrendRow[] = []
    for (let i = 0; i < count; i++) {
      const monthKey = dayjs(startMonth).add(i, 'month').format('YYYY-MM')
      const data = byMonth.get(monthKey) ?? { income: 0n, expense: 0n }
      result.push({ month: monthKey, income: data.income, expense: data.expense })
    }

    return result
  }

  async getDaily(organizationId: string, range: ReportDateRange): Promise<DailyReportRow[]> {
    const dateExpr = reportDayExpr()

    const rows = await db
      .select({
        date: dateExpr,
        income: sql<bigint>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${paidAmountExpr} ELSE 0 END), 0)`,
        expense: sql<bigint>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${reportExpenseAmountExpr} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          or(
            incomeInReportRangeCondition(range),
            expenseInReportRangeCondition(range)
          )
        )
      )
      .groupBy(dateExpr)
      .orderBy(dateExpr)

    const byDate = new Map(
      rows.map(row => [
        row.date,
        { income: toBigInt(row.income), expense: toBigInt(row.expense) },
      ])
    )

    const result: DailyReportRow[] = []
    let cursor = dayjs(range.from).startOf('day')
    const end = dayjs(range.to).startOf('day')

    while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
      const dateKey = cursor.format('YYYY-MM-DD')
      const data = byDate.get(dateKey) ?? { income: 0n, expense: 0n }
      result.push({ date: dateKey, income: data.income, expense: data.expense })
      cursor = cursor.add(1, 'day')
    }

    return result
  }
}
