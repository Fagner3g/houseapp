import { isWithinBillingRange } from '@houseapp/finance-core'

import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import type { ListStatements200StatementsItem } from '@/api/generated/model'
import { resolveBillingMonthKey, resolveStatementViewMonthKey } from '@/lib/billing-cycle'

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

export type PendingSplitReceivableInput = {
  transactionId: string
  accountId?: string | null
  accountType?: string | null
  transactionDate: string
  competenceDate?: string | null
  amount: string
  paidAmount: string
}

/** Resolve credit-card account for a pending split (API field or loaded card txs). */
export function resolvePendingSplitAccountId(
  split: Pick<PendingSplitReceivableInput, 'transactionId' | 'accountId'>,
  accountIdByTransactionId?: Map<string, string>
): string | null {
  if (split.accountId) return split.accountId
  return accountIdByTransactionId?.get(split.transactionId) ?? null
}

export function receivableMonthKeyForPurchase(
  account: CreditCardAccount,
  purchaseDate: string,
  statements: ListStatements200StatementsItem[] = []
): string {
  const closing = account.closingDay as number
  const due = account.dueDay as number

  const containing = statements.find(
    statement =>
      Boolean(statement.periodStart && statement.periodEnd) &&
      isWithinBillingRange(purchaseDate, statement.periodStart as string, statement.periodEnd as string)
  )

  if (containing) {
    return (
      resolveStatementViewMonthKey(containing, closing, due) ??
      resolveBillingMonthKey(purchaseDate, closing, due)
    )
  }

  return resolveBillingMonthKey(purchaseDate, closing, due)
}

export function receivableByMonthKey(
  account: CreditCardAccount,
  receivables: OverdueReceivableSplit[],
  statements: ListStatements200StatementsItem[] = []
): Map<string, number> {
  const byMonth = new Map<string, number>()

  for (const row of receivables) {
    if (row.accountId !== account.id || row.remainingReais <= 0) continue
    const monthKey = receivableMonthKeyForPurchase(account, row.purchaseDate, statements)
    byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + row.remainingReais)
  }

  return byMonth
}

export function receivablesFromPendingSplits(
  splits: PendingSplitReceivableInput[],
  remainingReais: (amount: string, paidAmount: string) => number,
  /** When set, accountId in this set counts as credit-card even if accountType is missing. */
  creditCardAccountIds?: Set<string>,
  /** Fallback when listPendingSplits omits accountId (match loaded card transactions). */
  accountIdByTransactionId?: Map<string, string>
): OverdueReceivableSplit[] {
  const rows: OverdueReceivableSplit[] = []

  for (const split of splits) {
    const accountId = resolvePendingSplitAccountId(split, accountIdByTransactionId)
    if (!accountId) continue
    const isCreditCard =
      split.accountType === 'credit_card' ||
      (creditCardAccountIds?.has(accountId) ?? false)
    if (!isCreditCard) continue
    const remaining = remainingReais(split.amount, split.paidAmount)
    if (remaining <= 0) continue
    rows.push({
      transactionId: split.transactionId,
      accountId,
      purchaseDate: split.competenceDate || split.transactionDate,
      remainingReais: remaining,
    })
  }

  return rows
}
