import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import { resolveBillingMonthKey } from '@/lib/billing-cycle'

type CreditCardAccount = Pick<
  ListAccounts200AccountsItem,
  'id' | 'name' | 'type' | 'closingDay' | 'dueDay'
>

export type OverdueReceivableSplit = {
  transactionId: string
  accountId: string
  purchaseDate: string
  remainingReais: number
}

export function receivableByMonthKey(
  account: CreditCardAccount,
  receivables: OverdueReceivableSplit[]
): Map<string, number> {
  const closing = account.closingDay as number
  const due = account.dueDay as number
  const byMonth = new Map<string, number>()

  for (const row of receivables) {
    if (row.accountId !== account.id || row.remainingReais <= 0) continue
    const monthKey = resolveBillingMonthKey(row.purchaseDate, closing, due)
    byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + row.remainingReais)
  }

  return byMonth
}

export function receivablesFromPendingSplits(
  splits: Array<{
    transactionId: string
    accountId?: string | null
    accountType?: string | null
    transactionDate: string
    competenceDate?: string | null
    amount: string
    paidAmount: string
  }>,
  remainingReais: (amount: string, paidAmount: string) => number,
  /** When set, accountId in this set counts as credit-card even if accountType is missing. */
  creditCardAccountIds?: Set<string>
): OverdueReceivableSplit[] {
  const rows: OverdueReceivableSplit[] = []

  for (const split of splits) {
    if (!split.accountId) continue
    const isCreditCard =
      split.accountType === 'credit_card' ||
      (creditCardAccountIds?.has(split.accountId) ?? false)
    if (!isCreditCard) continue
    const remaining = remainingReais(split.amount, split.paidAmount)
    if (remaining <= 0) continue
    rows.push({
      transactionId: split.transactionId,
      accountId: split.accountId,
      purchaseDate: split.competenceDate || split.transactionDate,
      remainingReais: remaining,
    })
  }

  return rows
}
