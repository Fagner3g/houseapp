import type { GetSplitDebtSummary200, ListSplits200SplitsItem } from '@/api/generated/model'
import { moneyStringToReais, reaisToMoneyString } from '@/lib/currency'

import { divideReais } from './installment-preview'

export type SplitDebtProgress = {
  totalReais: number
  paidReais: number
  remainingReais: number
  paidPercent: number
}

export function computeSplitDebtProgress(
  totalOwed: string,
  totalPaid: string
): SplitDebtProgress {
  const totalReais = moneyStringToReais(totalOwed)
  const paidReais = moneyStringToReais(totalPaid)
  const remainingReais = Math.max(0, totalReais - paidReais)
  const paidPercent = totalReais > 0 ? Math.min(100, (paidReais / totalReais) * 100) : 0

  return { totalReais, paidReais, remainingReais, paidPercent }
}

export function hasInstallmentSplitDebt(summary: GetSplitDebtSummary200 | undefined): boolean {
  if (!summary) return false
  return (
    (summary.installmentsTotal ?? 0) > 1 ||
    summary.persons.some(person => person.installments.length > 1)
  )
}

export function getPrimaryDebtPerson(summary: GetSplitDebtSummary200 | undefined) {
  return summary?.persons[0]
}

export function resolvePersonShareInstallmentAmountReais(input: {
  totalOwedReais: number
  installmentsTotal: number | null | undefined
  installmentNumber: number | null | undefined
  currentSplitAmountReais: number
  materializedInstallmentSplits: number
}): number {
  const {
    totalOwedReais,
    installmentsTotal,
    installmentNumber,
    currentSplitAmountReais,
    materializedInstallmentSplits,
  } = input

  if (installmentsTotal == null || installmentsTotal < 2 || totalOwedReais <= 0) {
    return currentSplitAmountReais
  }

  const sharePerInstallment = divideReais(totalOwedReais, installmentsTotal)
  const index = Math.max(0, (installmentNumber ?? 1) - 1)
  const installmentShare = sharePerInstallment[index] ?? currentSplitAmountReais

  // Vários splits (um por parcela) já trazem o valor correto da parcela.
  if (materializedInstallmentSplits > 1) {
    return currentSplitAmountReais
  }

  // Um único split com o total da dívida em compra parcelada → dividir.
  return installmentShare
}

export function formatPersonShareInstallmentAmount(
  input: Parameters<typeof resolvePersonShareInstallmentAmountReais>[0]
): string {
  return reaisToMoneyString(resolvePersonShareInstallmentAmountReais(input))
}

export function getSplitRemainingReais(
  split: Pick<ListSplits200SplitsItem, 'amount' | 'paidAmount'>
): number {
  return Math.max(0, moneyStringToReais(split.amount) - moneyStringToReais(split.paidAmount))
}

export function findDebtPersonForSplit(
  split: Pick<ListSplits200SplitsItem, 'userId' | 'contactName' | 'contactPhone'>,
  debtSummary?: GetSplitDebtSummary200
) {
  if (!debtSummary) return undefined
  return debtSummary.persons.find(person => {
    if (split.userId) return person.userId === split.userId
    return (
      (person.contactName ?? '').trim() === (split.contactName ?? '').trim() &&
      (person.contactPhone ?? '').trim() === (split.contactPhone ?? '').trim()
    )
  })
}

export type SplitInstallmentContext = {
  debtSummary?: GetSplitDebtSummary200
  installmentNumber?: number | null
  installmentsTotal?: number | null
}

export function resolveSplitInstallmentRemainingReais(
  split: Pick<
    ListSplits200SplitsItem,
    'amount' | 'paidAmount' | 'userId' | 'contactName' | 'contactPhone'
  >,
  context?: SplitInstallmentContext
): number {
  const rawRemaining = getSplitRemainingReais(split)
  if (rawRemaining <= 0) return 0

  const totalInstallments = context?.debtSummary?.installmentsTotal ?? context?.installmentsTotal ?? null
  const currentInstallment =
    context?.debtSummary?.currentInstallmentNumber ?? context?.installmentNumber ?? null

  if (totalInstallments == null || totalInstallments < 2 || currentInstallment == null) {
    return rawRemaining
  }

  const person = findDebtPersonForSplit(split, context.debtSummary)
  if (!person) return rawRemaining

  const installmentShareOwed = resolvePersonShareInstallmentAmountReais({
    totalOwedReais: moneyStringToReais(person.totalOwed),
    installmentsTotal: totalInstallments,
    installmentNumber: currentInstallment,
    currentSplitAmountReais: moneyStringToReais(split.amount),
    materializedInstallmentSplits: 1,
  })

  if (person.installments.length > 1) {
    const paidOnThisInstallment = Math.min(
      moneyStringToReais(split.paidAmount),
      installmentShareOwed
    )
    return Math.max(0, installmentShareOwed - paidOnThisInstallment)
  }

  const sharePerInstallment = divideReais(moneyStringToReais(person.totalOwed), totalInstallments)
  const owedBeforeCurrent = sharePerInstallment
    .slice(0, currentInstallment - 1)
    .reduce((sum, share) => sum + share, 0)
  const totalPaidReais = moneyStringToReais(split.paidAmount)

  if (totalPaidReais <= owedBeforeCurrent) {
    return installmentShareOwed
  }

  const paidOnCurrent = Math.min(totalPaidReais - owedBeforeCurrent, installmentShareOwed)
  return Math.max(0, installmentShareOwed - paidOnCurrent)
}

export function getUnsettledSplits(splits: ListSplits200SplitsItem[]): ListSplits200SplitsItem[] {
  return splits.filter(split => split.status === 'pending' || split.status === 'partial')
}

export type UnsettledSplitItem = {
  split: ListSplits200SplitsItem
  remainingReais: number
  label: string
}

export function buildUnsettledSplitItems(
  splits: ListSplits200SplitsItem[],
  resolveLabel: (split: ListSplits200SplitsItem) => string,
  context?: SplitInstallmentContext
): UnsettledSplitItem[] {
  return getUnsettledSplits(splits)
    .map(split => ({
      split,
      remainingReais: resolveSplitInstallmentRemainingReais(split, context),
      label: resolveLabel(split),
    }))
    .filter(item => item.remainingReais > 0)
}

export function hasUnsettledSplits(
  splits: ListSplits200SplitsItem[],
  context?: SplitInstallmentContext
): boolean {
  return buildUnsettledSplitItems(splits, () => '', context).length > 0
}
