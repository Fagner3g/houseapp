import { centsToReais, moneyStringToCents, reaisToCents } from '@/lib/currency'

export type AccountBalanceBridge = {
  beforePeriod: number
  periodNet: number
  balance: number
  income: number
  expense: number
}

/** Derives start-of-period balance from current balance and period cash flow. */
export function accountBalanceBridge(params: {
  balance: string
  income: string
  expense: string
}): AccountBalanceBridge {
  const balanceCents = moneyStringToCents(params.balance)
  const incomeCents = moneyStringToCents(params.income)
  const expenseCents = moneyStringToCents(params.expense)
  const periodNetCents = incomeCents - expenseCents

  return {
    beforePeriod: centsToReais(balanceCents - periodNetCents),
    periodNet: centsToReais(periodNetCents),
    balance: centsToReais(balanceCents),
    income: centsToReais(incomeCents),
    expense: centsToReais(expenseCents),
  }
}

export function formatSignedCurrency(
  value: number,
  formatCurrency: (n: number) => string
): string {
  if (reaisToCents(value) === 0) return formatCurrency(0)
  const sign = value > 0 ? '+' : '−'
  return `${sign}${formatCurrency(Math.abs(value))}`
}
