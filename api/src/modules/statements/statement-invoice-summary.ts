import dayjs from 'dayjs'

type StatementLine = {
  type: 'income' | 'expense'
  amount: string
  date: string
}

function isWithinRange(date: string, start: string, end: string): boolean {
  const d = dayjs(date)
  const from = dayjs(start).startOf('day')
  const to = dayjs(end).endOf('day')
  return !d.isBefore(from) && !d.isAfter(to)
}

export function sumExpensesInPeriod(
  transactions: StatementLine[],
  periodStart: string,
  periodEnd: string
): number {
  return transactions
    .filter(
      tx => tx.type === 'expense' && isWithinRange(tx.date, periodStart, periodEnd)
    )
    .reduce((sum, tx) => sum + Number.parseFloat(tx.amount), 0)
}

export function sumPaymentsInPeriod(
  transactions: StatementLine[],
  periodEnd: string,
  dueDate: string
): number {
  return transactions
    .filter(tx => tx.type === 'income' && isWithinRange(tx.date, periodEnd, dueDate))
    .reduce((sum, tx) => sum + Number.parseFloat(tx.amount), 0)
}

/** Fills missing summary fields for closed invoice imports (OFX/PDF). */
export function resolveImportedSummaryForImport(input: {
  isClosed?: boolean
  totalAmount: string
  periodStart: string
  periodEnd: string
  dueDate: string
  transactions: StatementLine[]
  previousBalance?: string | null
  purchasesTotal?: string | null
  paymentsReceived?: string | null
}): {
  purchasesTotal: string | null
  paymentsReceived: string | null
  previousBalance: string | null
} {
  if (!input.isClosed) {
    return {
      purchasesTotal: input.purchasesTotal ?? null,
      paymentsReceived: input.paymentsReceived ?? null,
      previousBalance: input.previousBalance ?? null,
    }
  }

  const summary = deriveImportedStatementSummary({
    totalAmount: input.totalAmount,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    dueDate: input.dueDate,
    transactions: input.transactions,
    previousBalance: input.previousBalance,
    purchasesTotal: input.purchasesTotal,
    paymentsReceived: input.paymentsReceived,
  })

  return summary
}

/** Derives purchases, payments and previous balance from an imported closed invoice. */
export function deriveImportedStatementSummary(input: {
  totalAmount: string
  periodStart: string
  periodEnd: string
  dueDate: string
  transactions: StatementLine[]
  previousBalance?: string | null
  purchasesTotal?: string | null
  paymentsReceived?: string | null
}): {
  purchasesTotal: string
  paymentsReceived: string
  previousBalance: string
} {
  const invoiceTotal = Number.parseFloat(input.totalAmount)
  const purchases =
    input.purchasesTotal != null
      ? Number.parseFloat(input.purchasesTotal)
      : sumExpensesInPeriod(input.transactions, input.periodStart, input.periodEnd)
  const payments =
    input.paymentsReceived != null
      ? Number.parseFloat(input.paymentsReceived)
      : sumPaymentsInPeriod(input.transactions, input.periodEnd, input.dueDate)
  const previousBalance =
    input.previousBalance != null
      ? Number.parseFloat(input.previousBalance)
      : Math.max(0, invoiceTotal - purchases)

  return {
    purchasesTotal: purchases.toFixed(2),
    paymentsReceived: payments.toFixed(2),
    previousBalance: previousBalance.toFixed(2),
  }
}
