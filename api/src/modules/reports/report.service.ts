import dayjs from 'dayjs'

import type { MonthlySummaryData } from '@/domain/ai/report-context'
import { centavosToString } from '@/core/money'

import type {
  AccountReportRow,
  CardTransactionsReportResult,
  CategoryReportRow,
  DailyReportRow,
  MonthlyTrendRow,
  ReportDateRange,
  ReportRepository,
  UpcomingTransactionRow,
} from './report.repository'

export type UpcomingTransactionDto = {
  id: string
  title: string
  amount: string | null
  type: string
  date: string
  status: string
  accountId: string | null
}

export type SummaryReportDto = {
  totalIncome: string
  totalExpense: string
  myExpenseTotal: string
  netWorth: string
  pendingCount: number
  overdueCount: number
  pendingSplitsTotal: string
  myPendingSplitsTotal: string
  upcoming: UpcomingTransactionDto[]
}

export type AccountReportDto = {
  accountId: string
  name: string
  type: string
  balance: string
  income: string
  expense: string
}

export type CategoryReportDto = {
  categoryId: string
  name: string
  color: string | null
  total: string
  percentage: string
}

export type CardTransactionReportDto = {
  transactionId: string
  title: string
  amount: string
  myAmount: string
  purchaseDate: string
  cardId: string | null
  cardLabel: string | null
  lastFourDigits: string | null
  accountId: string
  accountName: string
  percentage: string
}

export type ByCardReportDto = {
  transactions: CardTransactionReportDto[]
  grandTotal: string
  myGrandTotal: string
}

export type MonthlyTrendDto = {
  month: string
  income: string
  expense: string
  balance: string
}

export type TrendsReportDto = {
  months: MonthlyTrendDto[]
}

export type DailyReportDto = {
  date: string
  income: string
  expense: string
}

export type DailyFlowReportDto = {
  days: DailyReportDto[]
}

function parseDateRange(dateFrom?: string, dateTo?: string): ReportDateRange {
  const now = dayjs()
  const from = dateFrom ? dayjs(dateFrom) : now.startOf('month')
  const to = dateTo ? dayjs(dateTo) : now.endOf('month')

  return {
    from: from.toDate(),
    to: to.toDate(),
  }
}

function toUpcomingDto(row: UpcomingTransactionRow): UpcomingTransactionDto {
  return {
    id: row.id,
    title: row.title,
    amount: centavosToString(row.amount),
    type: row.type,
    date: row.date.toISOString(),
    status: row.status,
    accountId: row.accountId,
  }
}

function toAccountDto(row: AccountReportRow): AccountReportDto {
  return {
    accountId: row.accountId,
    name: row.name,
    type: row.type,
    balance: centavosToString(row.balance) ?? '0.00',
    income: centavosToString(row.income) ?? '0.00',
    expense: centavosToString(row.expense) ?? '0.00',
  }
}

function toCategoryDtos(rows: CategoryReportRow[]): CategoryReportDto[] {
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0n)

  return rows.map(row => {
    const percentage =
      grandTotal > 0n
        ? (Number((row.total * 10000n) / grandTotal) / 100).toFixed(2)
        : '0.00'

    return {
      categoryId: row.categoryId,
      name: row.name,
      color: row.color,
      total: centavosToString(row.total) ?? '0.00',
      percentage,
    }
  })
}

function toCardTransactionDtos(result: CardTransactionsReportResult): ByCardReportDto {
  const { transactions: rows, grandTotal, myGrandTotal } = result

  const transactions = rows.map(row => {
    const percentage =
      grandTotal > 0n
        ? (Number((row.amount * 10000n) / grandTotal) / 100).toFixed(2)
        : '0.00'

    return {
      transactionId: row.transactionId,
      title: row.title,
      amount: centavosToString(row.amount) ?? '0.00',
      myAmount: centavosToString(row.myAmount) ?? '0.00',
      purchaseDate: row.purchaseDate.toISOString(),
      cardId: row.cardId,
      cardLabel: row.cardLabel,
      lastFourDigits: row.lastFourDigits,
      accountId: row.accountId,
      accountName: row.accountName,
      percentage,
    }
  })

  return {
    transactions,
    grandTotal: centavosToString(grandTotal) ?? '0.00',
    myGrandTotal: centavosToString(myGrandTotal) ?? '0.00',
  }
}

function toTrendDtos(rows: MonthlyTrendRow[]): MonthlyTrendDto[] {
  return rows.map(row => ({
    month: row.month,
    income: centavosToString(row.income) ?? '0.00',
    expense: centavosToString(row.expense) ?? '0.00',
    balance: centavosToString(row.income - row.expense) ?? '0.00',
  }))
}

function toDailyDtos(rows: DailyReportRow[]): DailyReportDto[] {
  return rows.map(row => ({
    date: row.date,
    income: centavosToString(row.income) ?? '0.00',
    expense: centavosToString(row.expense) ?? '0.00',
  }))
}

export class ReportService {
  constructor(private readonly reportRepository: ReportRepository) {}

  async getSummary(
    organizationId: string,
    userId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<SummaryReportDto> {
    const range = parseDateRange(dateFrom, dateTo)
    const [summary, upcoming] = await Promise.all([
      this.reportRepository.getSummary(organizationId, range, userId),
      this.reportRepository.listUpcoming(organizationId, 7),
    ])

    return {
      totalIncome: centavosToString(summary.totalIncome) ?? '0.00',
      totalExpense: centavosToString(summary.totalExpense) ?? '0.00',
      myExpenseTotal: centavosToString(summary.myExpenseTotal) ?? '0.00',
      netWorth: centavosToString(summary.netWorth) ?? '0.00',
      pendingCount: summary.pendingCount,
      overdueCount: summary.overdueCount,
      pendingSplitsTotal: centavosToString(summary.pendingSplitsTotal) ?? '0.00',
      myPendingSplitsTotal: centavosToString(summary.myPendingSplitsTotal) ?? '0.00',
      upcoming: upcoming.map(toUpcomingDto),
    }
  }

  async getByAccount(
    organizationId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<AccountReportDto[]> {
    const range = parseDateRange(dateFrom, dateTo)
    const rows = await this.reportRepository.getByAccount(organizationId, range)
    return rows.map(toAccountDto)
  }

  async getByCategory(
    organizationId: string,
    type: 'income' | 'expense',
    dateFrom?: string,
    dateTo?: string
  ): Promise<CategoryReportDto[]> {
    const range = parseDateRange(dateFrom, dateTo)
    const rows = await this.reportRepository.getByCategory(organizationId, range, type)
    return toCategoryDtos(rows)
  }

  async getByCard(
    organizationId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ByCardReportDto> {
    const range = parseDateRange(dateFrom, dateTo)
    const result = await this.reportRepository.getByCard(organizationId, range)
    return toCardTransactionDtos(result)
  }

  async getTrends(organizationId: string, months = 6, endMonth?: string): Promise<TrendsReportDto> {
    const rows = await this.reportRepository.getTrends(organizationId, months, endMonth)
    return { months: toTrendDtos(rows) }
  }

  async getDaily(
    organizationId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<DailyFlowReportDto> {
    const range = parseDateRange(dateFrom, dateTo)
    const rows = await this.reportRepository.getDaily(organizationId, range)
    return { days: toDailyDtos(rows) }
  }

  async buildMonthlySummaryData(
    organizationId: string,
    userId: string,
    personName?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<MonthlySummaryData> {
    const range = parseDateRange(dateFrom, dateTo)
    const [summary, topExpenses, topReceivables, overdueTotal] = await Promise.all([
      this.reportRepository.getSummary(organizationId, range, userId),
      this.reportRepository.listTopPending(organizationId, 'expense', 5),
      this.reportRepository.listTopPending(organizationId, 'income', 5),
      this.reportRepository.getOverdueTotal(organizationId),
    ])

    const parseAmount = (value: string | null | undefined) =>
      Number.parseFloat((value ?? '0').replace(',', '.')) || 0

    const incomeRegistered = parseAmount(centavosToString(summary.totalIncome))
    const expenseRegistered = parseAmount(centavosToString(summary.totalExpense))

    const headerMonth = dayjs(range.from).format('MMMM [de] YYYY')

    return {
      personName,
      headerMonth,
      kpis: {
        incomeRegistered,
        expenseRegistered,
        receivedTotal: incomeRegistered,
        toReceiveTotal: parseAmount(centavosToString(topReceivables.reduce((sum, row) => sum + row.amount, 0n))),
        toSpendTotal: parseAmount(centavosToString(topExpenses.reduce((sum, row) => sum + row.amount, 0n))),
      },
      balance: incomeRegistered - expenseRegistered,
      topExpenses: topExpenses.map(row => ({
        name: row.name,
        amount: parseAmount(centavosToString(row.amount)),
      })),
      topReceivables: topReceivables.map(row => ({
        name: row.name,
        amount: parseAmount(centavosToString(row.amount)),
      })),
      overdueCount: summary.overdueCount,
      overdueTotal: parseAmount(centavosToString(overdueTotal)),
    }
  }
}
