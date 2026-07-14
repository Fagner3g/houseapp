import type { GetSplitDebtSummary200, GetTransaction200Transaction } from '@/api/generated/model'
import { moneyStringToReais, reaisToMoneyString } from '@/lib/currency'

import { divideReais } from './installment-preview'

export function transactionRemainingReais(
  amount: string | null | undefined,
  paidAmount: string | null | undefined
): number {
  return Math.max(0, moneyStringToReais(amount) - moneyStringToReais(paidAmount))
}

/** Amount null/empty/0 means value will be filled in later (e.g. recurring bill). */
export function isTransactionReminderWithoutValue(
  amount: string | null | undefined
): boolean {
  return amount == null || amount === '' || moneyStringToReais(amount) <= 0
}

export function resolveTransactionListAmountReais(
  amount: string | null | undefined,
  paidAmount: string | null | undefined,
  splitPaidReais = 0
): number {
  return Math.max(0, transactionRemainingReais(amount, paidAmount) - splitPaidReais)
}

export function isTransactionPartiallyPaid(
  amount: string | null | undefined,
  paidAmount: string | null | undefined,
  splitPaidReais = 0
): boolean {
  const totalReais = moneyStringToReais(amount)
  if (totalReais <= 0) return false

  const remainingReais = resolveTransactionListAmountReais(amount, paidAmount, splitPaidReais)
  return remainingReais > 0 && remainingReais < totalReais
}

export function resolveTransactionInstallmentAmountReais(
  tx: Pick<
    GetTransaction200Transaction,
    'amount' | 'installmentNumber' | 'installmentsTotal' | 'source'
  > | null | undefined,
  summary?: Pick<GetSplitDebtSummary200, 'currentTransactionAmount' | 'purchaseTotal'> | null
): number {
  if (!tx?.amount) return 0

  if (summary?.currentTransactionAmount) {
    return moneyStringToReais(summary.currentTransactionAmount)
  }

  const installmentsTotal = tx.installmentsTotal ?? 0
  if (installmentsTotal < 2) {
    return moneyStringToReais(tx.amount)
  }

  // Recurring (and API-resolved import summaries) already store the parcel amount.
  if (tx.source === 'recurring') {
    return moneyStringToReais(tx.amount)
  }

  const purchaseTotalReais = summary?.purchaseTotal
    ? moneyStringToReais(summary.purchaseTotal)
    : moneyStringToReais(tx.amount)

  const perInstallment = divideReais(purchaseTotalReais, installmentsTotal)
  const index = Math.max(0, (tx.installmentNumber ?? 1) - 1)

  return perInstallment[index] ?? moneyStringToReais(tx.amount)
}

export function resolveTransactionInstallmentRemainingReais(
  tx: Pick<
    GetTransaction200Transaction,
    'amount' | 'paidAmount' | 'installmentNumber' | 'installmentsTotal' | 'source'
  > | null | undefined,
  summary?: Pick<GetSplitDebtSummary200, 'currentTransactionAmount' | 'purchaseTotal'> | null
): number {
  if (!tx) return 0

  const installmentAmount = resolveTransactionInstallmentAmountReais(tx, summary)
  const paidReais = moneyStringToReais(tx.paidAmount)

  return Math.max(0, installmentAmount - paidReais)
}

export function formatTransactionInstallmentAmount(
  tx: Parameters<typeof resolveTransactionInstallmentAmountReais>[0],
  summary?: Parameters<typeof resolveTransactionInstallmentAmountReais>[1]
): string {
  return reaisToMoneyString(resolveTransactionInstallmentAmountReais(tx, summary))
}
