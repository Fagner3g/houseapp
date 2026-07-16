import { and, asc, count, desc, eq, gte, inArray, isNull, lt, lte, or, sql, sum } from 'drizzle-orm'
import dayjs from 'dayjs'

import { db } from '@/db'
import { accounts, type AccountType } from '@/db/schemas/accounts'
import { cards } from '@/db/schemas/cards'
import { categories } from '@/db/schemas/categories'
import { transactionCategories } from '@/db/schemas/transactionCategories'
import { transactionSplits } from '@/db/schemas/transactionSplits'
import { transactions } from '@/db/schemas/transactions'
import { isPayableTransactionCondition, isNotScheduledForFutureCondition } from '@/modules/transactions/payable-transaction'
import { UNPAID_TRANSACTION_STATUSES } from '@/core/transaction-payment'
import {
  userIsSplitCreditorCondition,
  userOwnsTransactionCondition,
} from '@/modules/splits/split-expense-attribution'
import {
  transactionVisibilityCondition,
  type TransactionViewer,
} from '@/modules/transactions/transaction-visibility'
import { accountVisibilityCondition } from '@/modules/transactions/account-visibility'

import {
  expenseAmountInRangeCase,
  expenseInReportRangeCondition,
  incomeAmountInRangeCase,
  incomeInReportRangeCondition,
  isCreditCardExpenseInRange,
  isInvoicePaymentTitleCondition,
  isNonCreditCardExpenseInRange,
  paidAmountExpr,
  purchaseDateExpr,
  reportDayExpr,
  reportExpenseAmountExpr,
  reportMonthExpr,
} from './report-spending'
import { sumNetWorth } from './report-summary.logic'
import { computeMySpendBreakdown, type MySpendBreakdown } from './my-spend'

export type ReportDateRange = {
  from: Date
  to: Date
}

export type ReportScopeOptions = {
  accountId?: string
  scope?: 'all' | 'credit_card'
  /** When set, includes manual entries plus lines from this imported statement only. */
  statementId?: string
  /** When true (and no statementId), excludes transactions linked to any imported statement. */
  excludeImported?: boolean
}

export type SummaryRow = {
  totalIncome: bigint
  totalExpense: bigint
  myExpenseGrossTotal: bigint
  mySplitsInPeriodTotal: bigint
  myExpenseTotal: bigint
  netWorth: bigint
  pendingCount: number
  overdueCount: number
  pendingSplitsTotal: bigint
  myPendingSplitsTotal: bigint
  myPendingSplitsInPeriodTotal: bigint
}

export type UpcomingTransactionRow = {
  id: string
  title: string
  amount: bigint | null
  type: string
  date: Date | string
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
  purchaseDate: Date | string
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

export type TopMerchantReportRow = {
  key: string
  label: string
  total: bigint
  occurrenceCount: number
  avgAmount: bigint
  lastDate: Date | string
  hasInstallments: boolean
  hasFullyDelegated: boolean
  delegatedToName: string | null
  hasDivided: boolean
  dividedWithName: string | null
}

export type TopMerchantsReportResult = {
  merchants: TopMerchantReportRow[]
  merchantCount: number
  grandTotal: bigint
}

export interface ReportRepository {
  getSummary(
    organizationId: string,
    range: ReportDateRange,
    userId: string,
    viewer?: TransactionViewer
  ): Promise<SummaryRow>
  listUpcoming(
    organizationId: string,
    days: number,
    viewer?: TransactionViewer
  ): Promise<UpcomingTransactionRow[]>
  getByAccount(
    organizationId: string,
    range: ReportDateRange,
    viewer?: TransactionViewer
  ): Promise<AccountReportRow[]>
  getByCategory(
    organizationId: string,
    range: ReportDateRange,
    type: 'income' | 'expense',
    userId: string | undefined,
    personal: boolean,
    scopeOptions?: ReportScopeOptions,
    viewer?: TransactionViewer
  ): Promise<CategoryReportRow[]>
  getByCard(
    organizationId: string,
    range: ReportDateRange,
    viewer?: TransactionViewer
  ): Promise<CardTransactionsReportResult>
  getTopMerchants(
    organizationId: string,
    range: ReportDateRange,
    userId: string,
    limit: number,
    scopeOptions?: ReportScopeOptions,
    personal?: boolean,
    viewer?: TransactionViewer
  ): Promise<TopMerchantsReportResult>
  listTopPending(
    organizationId: string,
    type: 'income' | 'expense',
    limit: number,
    viewer?: TransactionViewer
  ): Promise<PendingCounterpartyRow[]>
  getOverdueTotal(organizationId: string, viewer?: TransactionViewer): Promise<bigint>
  getTrends(
    organizationId: string,
    months: number,
    endMonth?: string,
    viewer?: TransactionViewer
  ): Promise<MonthlyTrendRow[]>
  getDaily(
    organizationId: string,
    range: ReportDateRange,
    viewer?: TransactionViewer
  ): Promise<DailyReportRow[]>
  getMySpendBreakdown(
    organizationId: string,
    range: ReportDateRange,
    userId: string,
    viewer?: TransactionViewer
  ): Promise<MySpendBreakdown>
}

function toBigInt(value: unknown): bigint {
  if (value == null) return 0n
  if (typeof value === 'bigint') return value
  return BigInt(String(value).split('.')[0] || '0')
}

function visibilityCondition(viewer?: TransactionViewer) {
  return transactionVisibilityCondition(viewer)
}


function splitSumExpr() {
  return sql<bigint>`COALESCE((
    SELECT SUM(${transactionSplits.amount})
    FROM ${transactionSplits}
    WHERE ${transactionSplits.transactionId} = ${transactions.id}
  ), 0)`
}

function myExpenseAmountExpr() {
  return sql<bigint>`GREATEST(${reportExpenseAmountExpr} - ${splitSumExpr()}, 0)`
}

function fullyDelegatedCondition() {
  return sql`${splitSumExpr()} >= ${reportExpenseAmountExpr} AND ${reportExpenseAmountExpr} > 0`
}

function partiallyDividedCondition() {
  return sql`${splitSumExpr()} > 0 AND ${splitSumExpr()} < ${reportExpenseAmountExpr} AND ${reportExpenseAmountExpr} > 0`
}

function delegateNameExpr() {
  return sql<string | null>`(
    SELECT COALESCE(u.name, ts.contact_name)
    FROM transaction_splits ts
    LEFT JOIN users u ON u.id = ts.user_id
    WHERE ts.transaction_id = ${transactions.id}
    ORDER BY ts.amount DESC
    LIMIT 1
  )`
}

function normalizedTitleExpr() {
  return sql<string>`LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(${transactions.title}, '\\s*-\\s*Parcela \\d+/\\d+', '', 'gi'), '\\s+Parcela \\d+/\\d+', '', 'gi')))`
}

function expenseRangeCondition(
  range: ReportDateRange,
  scopeOptions?: Pick<ReportScopeOptions, 'scope' | 'accountId'>
) {
  if (scopeOptions?.scope === 'credit_card') {
    return isCreditCardExpenseInRange(range)
  }

  // Account hub Análise: include pending so Extrato and Análise stay aligned.
  if (scopeOptions?.accountId) {
    return or(isCreditCardExpenseInRange(range), isNonCreditCardExpenseInRange(range))
  }

  return expenseInReportRangeCondition(range)
}

function invoiceStatementConditions(scopeOptions?: ReportScopeOptions) {
  if (scopeOptions?.statementId) {
    return or(
      isNull(transactions.statementId),
      eq(transactions.statementId, scopeOptions.statementId)
    )
  }

  if (scopeOptions?.excludeImported) {
    return isNull(transactions.statementId)
  }

  return undefined
}

function reportScopeConditions(scopeOptions?: ReportScopeOptions) {
  const conditions = []

  if (scopeOptions?.accountId) {
    conditions.push(eq(transactions.accountId, scopeOptions.accountId))
  }

  if (scopeOptions?.scope === 'credit_card') {
    conditions.push(eq(accounts.type, 'credit_card'))
  }

  const invoiceCondition = invoiceStatementConditions(scopeOptions)
  if (invoiceCondition) {
    conditions.push(invoiceCondition)
  }

  return conditions.length > 0 ? and(...conditions) : undefined
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
    userId: string,
    viewer?: TransactionViewer
  ): Promise<SummaryRow> {
    const todayStart = dayjs().startOf('day').toDate()
    const visible = visibilityCondition(viewer)

    const [incomeRow] = await db
      .select({ total: sum(incomeAmountInRangeCase(range)) })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(eq(transactions.organizationId, organizationId), visible))

    const [expenseRow] = await db
      .select({ total: sum(expenseAmountInRangeCase(range)) })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(eq(transactions.organizationId, organizationId), visible))

    const mySpend = await computeMySpendBreakdown(organizationId, range, userId, viewer)
    const myExpenseGross = mySpend.grossTotal
    const mySplitsInPeriod = mySpend.splitTotal
    const myExpenseTotal = mySpend.myTotal

    const [pendingRow] = await db
      .select({ total: count() })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactions.status, [...UNPAID_TRANSACTION_STATUSES]),
          isPayableTransactionCondition(),
          visible
        )
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
          isPayableTransactionCondition(),
          isNotScheduledForFutureCondition(),
          visible
        )
      )

    const accountRows = await this.getByAccount(organizationId, range, viewer)
    const netWorth = sumNetWorth(accountRows)

    const [splitsRow] = await db
      .select({
        pendingSplitsTotal: sql<bigint>`COALESCE(SUM(${transactionSplits.amount} - ${transactionSplits.paidAmount}), 0)`,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactionSplits.status, ['pending', 'partial']),
          visible
        )
      )

    const myPendingSplitsBase = and(
      eq(transactions.organizationId, organizationId),
      inArray(transactionSplits.status, ['pending', 'partial']),
      userIsSplitCreditorCondition(userId, viewer?.ownerId)
    )

    const [myPendingSplitsRow] = await db
      .select({
        myPendingSplitsTotal: sql<bigint>`COALESCE(SUM(${transactionSplits.amount} - ${transactionSplits.paidAmount}), 0)`,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .where(myPendingSplitsBase)

    const [myPendingSplitsInPeriodRow] = await db
      .select({
        myPendingSplitsInPeriodTotal: sql<bigint>`COALESCE(SUM(${transactionSplits.amount} - ${transactionSplits.paidAmount}), 0)`,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .where(
        and(
          myPendingSplitsBase,
          // Past + current period (overdue included); future installments stay in total only.
          lte(transactions.date, range.to)
        )
      )

    return {
      totalIncome: toBigInt(incomeRow?.total),
      totalExpense: toBigInt(expenseRow?.total),
      myExpenseGrossTotal: myExpenseGross,
      mySplitsInPeriodTotal: mySplitsInPeriod,
      myExpenseTotal,
      netWorth,
      pendingCount: pendingRow?.total ?? 0,
      overdueCount: overdueRow?.total ?? 0,
      pendingSplitsTotal: toBigInt(splitsRow?.pendingSplitsTotal),
      myPendingSplitsTotal: toBigInt(myPendingSplitsRow?.myPendingSplitsTotal),
      myPendingSplitsInPeriodTotal: toBigInt(
        myPendingSplitsInPeriodRow?.myPendingSplitsInPeriodTotal
      ),
    }
  }

  async listUpcoming(
    organizationId: string,
    days: number,
    viewer?: TransactionViewer
  ): Promise<UpcomingTransactionRow[]> {
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
          lte(transactions.date, until),
          isNotScheduledForFutureCondition(),
          visibilityCondition(viewer)
        )
      )
      .orderBy(asc(transactions.date), asc(transactions.title))
  }

  async getByAccount(
    organizationId: string,
    range: ReportDateRange,
    viewer?: TransactionViewer
  ): Promise<AccountReportRow[]> {
    const delta = balanceDeltaExpr()
    const visible = visibilityCondition(viewer)

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
      .leftJoin(
        transactions,
        and(eq(transactions.accountId, accounts.id), visible)
      )
      .where(
        and(
          eq(accounts.organizationId, organizationId),
          eq(accounts.isActive, true),
          accountVisibilityCondition(viewer, { ownedOnly: true })
        )
      )
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
    type: 'income' | 'expense',
    userId: string | undefined,
    personal: boolean,
    scopeOptions?: ReportScopeOptions,
    viewer?: TransactionViewer
  ): Promise<CategoryReportRow[]> {
    const rangeCondition =
      type === 'expense'
        ? expenseRangeCondition(range, scopeOptions)
        : incomeInReportRangeCondition(range)
    const applyOwnership = personal || scopeOptions?.scope === 'credit_card'
    const amountExpr =
      type === 'expense' && personal
        ? myExpenseAmountExpr()
        : type === 'expense'
          ? reportExpenseAmountExpr
          : paidAmountExpr

    const personalConditions = and(
      rangeCondition,
      applyOwnership && userId
        ? userOwnsTransactionCondition(userId, viewer?.ownerId)
        : undefined,
      personal && type === 'expense' && userId ? sql`${myExpenseAmountExpr()} > 0` : undefined,
      reportScopeConditions(scopeOptions),
      visibilityCondition(viewer)
    )

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
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .where(
        and(
          eq(categories.organizationId, organizationId),
          eq(categories.isActive, true),
          eq(categories.type, type),
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, type),
          personalConditions
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
    range: ReportDateRange,
    viewer?: TransactionViewer
  ): Promise<CardTransactionsReportResult> {
    const splitSumExpr = sql<bigint>`COALESCE((
      SELECT SUM(${transactionSplits.amount})
      FROM ${transactionSplits}
      WHERE ${transactionSplits.transactionId} = ${transactions.id}
    ), 0)`
    const myAmountExpr = sql<bigint>`GREATEST(${reportExpenseAmountExpr} - ${splitSumExpr}, 0)`
    const cardExpenseWhere = and(
      eq(transactions.organizationId, organizationId),
      isCreditCardExpenseInRange(range),
      visibilityCondition(viewer)
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

  async getTopMerchants(
    organizationId: string,
    range: ReportDateRange,
    userId: string,
    limit: number,
    scopeOptions?: ReportScopeOptions,
    personal = false,
    viewer?: TransactionViewer
  ): Promise<TopMerchantsReportResult> {
    const amountExpr = personal ? myExpenseAmountExpr() : reportExpenseAmountExpr
    const normalizedTitle = normalizedTitleExpr()
    const fullyDelegated = fullyDelegatedCondition()
    const partiallyDivided = partiallyDividedCondition()
    const expenseWhere = and(
      eq(transactions.organizationId, organizationId),
      expenseRangeCondition(range, scopeOptions),
      userOwnsTransactionCondition(userId, viewer?.ownerId),
      personal ? sql`${myExpenseAmountExpr()} > 0` : undefined,
      reportScopeConditions(scopeOptions),
      visibilityCondition(viewer)
    )

    const totalsQuery = db
      .select({ grandTotal: sql<bigint>`COALESCE(SUM(${amountExpr}), 0)` })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .where(expenseWhere)

    const merchantCountQuery = db
      .select({
        merchantCount: sql<number>`COUNT(DISTINCT ${normalizedTitle})::int`,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .where(expenseWhere)

    const rowsQuery = db
      .select({
        key: normalizedTitle,
        label: sql<string>`(array_agg(${transactions.title} ORDER BY ${purchaseDateExpr} DESC))[1]`,
        total: sql<bigint>`COALESCE(SUM(${amountExpr}), 0)`,
        occurrenceCount: sql<number>`COUNT(*)::int`,
        lastDate: sql<Date>`MAX(${purchaseDateExpr})`,
        hasInstallments: sql<boolean>`BOOL_OR(COALESCE(${transactions.installmentsTotal}, 0) > 1 OR ${transactions.title} ~* 'parcela \\d+/\\d+')`,
        hasFullyDelegated: sql<boolean>`BOOL_OR(${fullyDelegated})`,
        delegatedToName: sql<string | null>`MAX(CASE WHEN ${fullyDelegated} THEN ${delegateNameExpr()} END)`,
        hasDivided: sql<boolean>`BOOL_OR(${partiallyDivided})`,
        dividedWithName: sql<string | null>`MAX(CASE WHEN ${partiallyDivided} THEN ${delegateNameExpr()} END)`,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .where(expenseWhere)
      .groupBy(normalizedTitle)
      .orderBy(sql`COALESCE(SUM(${amountExpr}), 0) DESC`, normalizedTitle)
      .limit(limit)

    const [[totalsRow], [countRow], rows] = await Promise.all([
      totalsQuery,
      merchantCountQuery,
      rowsQuery,
    ])

    const grandTotal = toBigInt(totalsRow?.grandTotal)

    return {
      merchantCount: Number(countRow?.merchantCount) || 0,
      merchants: rows.map(row => {
        const total = toBigInt(row.total)
        const occurrenceCount = Number(row.occurrenceCount) || 0
        const avgAmount =
          occurrenceCount > 0 ? total / BigInt(occurrenceCount) : 0n

        return {
          key: row.key,
          label: row.label,
          total,
          occurrenceCount,
          avgAmount,
          lastDate: row.lastDate,
          hasInstallments: Boolean(row.hasInstallments),
          hasFullyDelegated: Boolean(row.hasFullyDelegated),
          delegatedToName: row.delegatedToName ?? null,
          hasDivided: Boolean(row.hasDivided),
          dividedWithName: row.dividedWithName ?? null,
        }
      }),
      grandTotal,
    }
  }

  async listTopPending(
    organizationId: string,
    type: 'income' | 'expense',
    limit: number,
    viewer?: TransactionViewer
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
          isPayableTransactionCondition(),
          visibilityCondition(viewer)
        )
      )
      .orderBy(sql`COALESCE(${transactions.amount}, 0) DESC`, transactions.title)
      .limit(limit)

    return rows.map(row => ({
      name: row.name,
      amount: toBigInt(row.amount),
    }))
  }

  async getOverdueTotal(
    organizationId: string,
    viewer?: TransactionViewer
  ): Promise<bigint> {
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
          isPayableTransactionCondition(),
          isNotScheduledForFutureCondition(),
          visibilityCondition(viewer)
        )
      )

    return toBigInt(row?.total)
  }

  async getTrends(
    organizationId: string,
    months: number,
    endMonth?: string,
    viewer?: TransactionViewer
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
          ),
          visibilityCondition(viewer)
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

  async getDaily(
    organizationId: string,
    range: ReportDateRange,
    viewer?: TransactionViewer
  ): Promise<DailyReportRow[]> {
    const dateExpr = reportDayExpr()
    const personal = Boolean(viewer)
    const expenseExpr = personal ? myExpenseAmountExpr() : reportExpenseAmountExpr
    const ownership =
      personal && viewer
        ? userOwnsTransactionCondition(viewer.userId, viewer.ownerId)
        : undefined

    const rows = await db
      .select({
        date: dateExpr,
        income: sql<bigint>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${paidAmountExpr} ELSE 0 END), 0)`,
        expense: sql<bigint>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${expenseExpr} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          or(
            incomeInReportRangeCondition(range),
            expenseInReportRangeCondition(range)
          ),
          visibilityCondition(viewer),
          ownership
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

  async getMySpendBreakdown(
    organizationId: string,
    range: ReportDateRange,
    userId: string,
    viewer?: TransactionViewer
  ) {
    return computeMySpendBreakdown(organizationId, range, userId, viewer)
  }
}
