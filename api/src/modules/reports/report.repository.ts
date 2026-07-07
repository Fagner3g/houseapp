import { and, asc, count, eq, gte, inArray, lt, lte, sql, sum } from 'drizzle-orm'
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

export type CardReportRow = {
  cardId: string
  label: string
  lastFourDigits: string | null
  accountId: string
  accountName: string
  total: bigint
  myTotal: bigint
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
  getByCard(organizationId: string, range: ReportDateRange): Promise<CardReportRow[]>
  listTopPending(
    organizationId: string,
    type: 'income' | 'expense',
    limit: number
  ): Promise<PendingCounterpartyRow[]>
  getOverdueTotal(organizationId: string): Promise<bigint>
  getTrends(organizationId: string, months: number): Promise<MonthlyTrendRow[]>
  getDaily(organizationId: string, range: ReportDateRange): Promise<DailyReportRow[]>
}

const paidAmountExpr = sql<bigint>`COALESCE(${transactions.paidAmount}, ${transactions.amount}, 0)`

function toBigInt(value: unknown): bigint {
  if (value == null) return 0n
  if (typeof value === 'bigint') return value
  return BigInt(String(value).split('.')[0] || '0')
}

function paidInRangeConditions(organizationId: string, range: ReportDateRange, type: 'income' | 'expense') {
  return and(
    eq(transactions.organizationId, organizationId),
    eq(transactions.type, type),
    eq(transactions.status, 'paid'),
    gte(transactions.date, range.from),
    lte(transactions.date, range.to)
  )
}

function balanceDeltaExpr() {
  return sql<bigint>`CASE
    WHEN ${transactions.status} = 'paid' AND ${transactions.type} = 'income' THEN ${paidAmountExpr}
    WHEN ${transactions.status} = 'paid' AND ${transactions.type} = 'expense' THEN -${paidAmountExpr}
    ELSE 0
  END`
}

export class DrizzleReportRepository implements ReportRepository {
  async getSummary(
    organizationId: string,
    range: ReportDateRange,
    userId: string
  ): Promise<SummaryRow> {
    const todayStart = dayjs().startOf('day').toDate()

    const [incomeRow] = await db
      .select({ total: sum(paidAmountExpr) })
      .from(transactions)
      .where(paidInRangeConditions(organizationId, range, 'income'))

    const [expenseRow] = await db
      .select({ total: sum(paidAmountExpr) })
      .from(transactions)
      .where(paidInRangeConditions(organizationId, range, 'expense'))

    const expenseOwnerConditions = and(
      paidInRangeConditions(organizationId, range, 'expense'),
      userOwnsTransactionCondition(userId)
    )

    const [myExpenseRow] = await db
      .select({ total: sum(paidAmountExpr) })
      .from(transactions)
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .where(expenseOwnerConditions)

    const [mySplitsRow] = await db
      .select({
        total: sql<bigint>`COALESCE(SUM(${transactionSplits.amount}), 0)`,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .where(expenseOwnerConditions)

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
        income: sql<bigint>`COALESCE(SUM(CASE
          WHEN ${transactions.type} = 'income' AND ${transactions.status} = 'paid'
            AND ${transactions.date} >= ${range.from.toISOString()}::timestamptz
            AND ${transactions.date} <= ${range.to.toISOString()}::timestamptz
          THEN ${paidAmountExpr}
          ELSE 0
        END), 0)`,
        expense: sql<bigint>`COALESCE(SUM(CASE
          WHEN ${transactions.type} = 'expense' AND ${transactions.status} = 'paid'
            AND ${transactions.date} >= ${range.from.toISOString()}::timestamptz
            AND ${transactions.date} <= ${range.to.toISOString()}::timestamptz
          THEN ${paidAmountExpr}
          ELSE 0
        END), 0)`,
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
    const rows = await db
      .select({
        categoryId: categories.id,
        name: categories.name,
        color: categories.color,
        total: sql<bigint>`COALESCE(SUM(${paidAmountExpr}), 0)`,
      })
      .from(categories)
      .innerJoin(transactionCategories, eq(transactionCategories.categoryId, categories.id))
      .innerJoin(transactions, eq(transactionCategories.transactionId, transactions.id))
      .where(
        and(
          eq(categories.organizationId, organizationId),
          eq(categories.isActive, true),
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, type),
          eq(transactions.status, 'paid'),
          gte(transactions.date, range.from),
          lte(transactions.date, range.to)
        )
      )
      .groupBy(categories.id, categories.name, categories.color)
      .orderBy(sql`COALESCE(SUM(${paidAmountExpr}), 0) DESC`, categories.name)

    return rows.map(row => ({
      ...row,
      total: toBigInt(row.total),
    }))
  }

  async getByCard(organizationId: string, range: ReportDateRange): Promise<CardReportRow[]> {
    const splitSumExpr = sql<bigint>`COALESCE((
      SELECT SUM(${transactionSplits.amount})
      FROM ${transactionSplits}
      WHERE ${transactionSplits.transactionId} = ${transactions.id}
    ), 0)`

    const rows = await db
      .select({
        cardId: cards.id,
        label: cards.label,
        lastFourDigits: cards.lastFourDigits,
        accountId: accounts.id,
        accountName: accounts.name,
        total: sql<bigint>`COALESCE(SUM(${paidAmountExpr}), 0)`,
        myTotal: sql<bigint>`COALESCE(SUM(${paidAmountExpr} - ${splitSumExpr}), 0)`,
      })
      .from(transactions)
      .innerJoin(cards, eq(transactions.cardId, cards.id))
      .innerJoin(accounts, eq(cards.accountId, accounts.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, 'expense'),
          eq(transactions.status, 'paid'),
          gte(transactions.date, range.from),
          lte(transactions.date, range.to)
        )
      )
      .groupBy(cards.id, cards.label, cards.lastFourDigits, accounts.id, accounts.name)
      .orderBy(sql`COALESCE(SUM(${paidAmountExpr}), 0) DESC`, cards.label)

    return rows.map(row => ({
      ...row,
      total: toBigInt(row.total),
      myTotal: toBigInt(row.myTotal),
    }))
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

  async getTrends(organizationId: string, months: number): Promise<MonthlyTrendRow[]> {
    const count = Math.min(Math.max(months, 1), 24)
    const startMonth = dayjs().subtract(count - 1, 'month').startOf('month').toDate()
    const endMonth = dayjs().endOf('month').toDate()

    const monthExpr = sql<string>`to_char(date_trunc('month', ${transactions.date}), 'YYYY-MM')`

    const rows = await db
      .select({
        month: monthExpr,
        income: sql<bigint>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${paidAmountExpr} ELSE 0 END), 0)`,
        expense: sql<bigint>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${paidAmountExpr} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.status, 'paid'),
          inArray(transactions.type, ['income', 'expense']),
          gte(transactions.date, startMonth),
          lte(transactions.date, endMonth)
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
    const dateExpr = sql<string>`to_char(${transactions.date}::date, 'YYYY-MM-DD')`

    const rows = await db
      .select({
        date: dateExpr,
        income: sql<bigint>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${paidAmountExpr} ELSE 0 END), 0)`,
        expense: sql<bigint>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${paidAmountExpr} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.status, 'paid'),
          inArray(transactions.type, ['income', 'expense']),
          gte(transactions.date, range.from),
          lte(transactions.date, range.to)
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
