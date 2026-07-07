import { centavosToString, divideCentavos } from '@/core/money'
import { stripInstallmentBaseTitle } from '@/modules/transactions/credit-card-installments.logic'
import type { TransactionRecord } from '@/modules/transactions/transaction.repository'

import type { SplitRecord } from './split.repository'

export type SplitDebtInstallmentRow = {
  installmentNumber: number
  transactionId: string
  transactionAmount: string
  splitId: string
  amount: string
  paidAmount: string
  status: SplitRecord['status']
}

export type SplitDebtPersonRow = {
  key: string
  name: string
  userId: string | null
  contactName: string | null
  contactPhone: string | null
  totalOwed: string
  totalPaid: string
  totalRemaining: string
  status: SplitRecord['status']
  installments: SplitDebtInstallmentRow[]
}

export type SplitDebtSummary = {
  purchaseTotal: string
  myShareTotal: string
  installmentsTotal: number | null
  currentInstallmentNumber: number | null
  currentTransactionAmount: string | null
  persons: SplitDebtPersonRow[]
}

export type SplitWithTransaction = SplitRecord & {
  installmentNumber: number | null
  transactionAmount: bigint | null
  userName?: string | null
}

export function personKey(
  split: Pick<SplitRecord, 'userId' | 'contactName' | 'contactPhone'>
): string {
  if (split.userId) return `user:${split.userId}`
  const name = (split.contactName ?? '').trim().toLowerCase()
  const phone = (split.contactPhone ?? '').trim()
  return `contact:${name}:${phone}`
}

function aggregateStatus(statuses: SplitRecord['status'][]): SplitRecord['status'] {
  if (statuses.length === 0) return 'pending'
  if (statuses.every(status => status === 'paid' || status === 'forgiven')) {
    return statuses.every(status => status === 'forgiven') ? 'forgiven' : 'paid'
  }
  if (statuses.some(status => status === 'partial' || status === 'paid')) return 'partial'
  return 'pending'
}

export function matchesInstallmentSeries(
  candidate: Pick<
    TransactionRecord,
    'title' | 'installmentsTotal' | 'accountId' | 'cardId' | 'organizationId'
  >,
  anchor: Pick<
    TransactionRecord,
    'title' | 'installmentsTotal' | 'accountId' | 'cardId' | 'organizationId'
  >
): boolean {
  if (candidate.organizationId !== anchor.organizationId) return false
  if (candidate.installmentsTotal !== anchor.installmentsTotal) return false
  if (candidate.installmentsTotal == null || candidate.installmentsTotal < 2) return false
  if (candidate.accountId !== anchor.accountId) return false
  if (candidate.cardId !== anchor.cardId) return false

  return (
    stripInstallmentBaseTitle(candidate.title) === stripInstallmentBaseTitle(anchor.title)
  )
}

export function resolveInstallmentPurchaseTotalCentavos(
  siblingTransactions: Pick<TransactionRecord, 'amount'>[],
  installmentsTotal: number | null
): bigint {
  const sum = siblingTransactions.reduce((total, row) => total + (row.amount ?? 0n), 0n)

  if (installmentsTotal == null || installmentsTotal < 2) {
    return sum
  }

  if (siblingTransactions.length === 1) {
    return siblingTransactions[0]?.amount ?? 0n
  }

  const materialized = siblingTransactions.length
  if (materialized < installmentsTotal) {
    const amounts = siblingTransactions.map(row => row.amount ?? 0n)
    const firstAmount = amounts[0] ?? 0n
    const allSame = amounts.every(amount => amount === firstAmount)
    if (allSame && firstAmount > 0n) {
      return firstAmount * BigInt(installmentsTotal)
    }
  }

  return sum
}

export function resolveInstallmentAmountCentavos(
  anchorTransaction: Pick<TransactionRecord, 'amount' | 'installmentNumber'>,
  purchaseTotalCentavos: bigint,
  installmentsTotal: number | null
): bigint | null {
  if (anchorTransaction.amount == null) return null
  if (installmentsTotal == null || installmentsTotal < 2) {
    return anchorTransaction.amount
  }

  const installmentNumber = anchorTransaction.installmentNumber ?? 1
  const amounts = divideCentavos(purchaseTotalCentavos, installmentsTotal)
  return amounts[installmentNumber - 1] ?? anchorTransaction.amount
}

export function resolvePersonShareInstallmentAmountCentavos(input: {
  totalOwedCentavos: bigint
  installmentsTotal: number | null
  installmentNumber: number | null
  currentSplitAmountCentavos: bigint
  materializedInstallmentSplits: number
}): bigint {
  const {
    totalOwedCentavos,
    installmentsTotal,
    installmentNumber,
    currentSplitAmountCentavos,
    materializedInstallmentSplits,
  } = input

  if (installmentsTotal == null || installmentsTotal < 2 || totalOwedCentavos <= 0n) {
    return currentSplitAmountCentavos
  }

  const sharePerInstallment = divideCentavos(totalOwedCentavos, installmentsTotal)
  const index = Math.max(0, (installmentNumber ?? 1) - 1)
  const installmentShare = sharePerInstallment[index] ?? currentSplitAmountCentavos

  if (materializedInstallmentSplits > 1) {
    return currentSplitAmountCentavos
  }

  return installmentShare
}

export function buildSplitDebtSummary(input: {
  anchorTransaction: TransactionRecord
  siblingTransactions: TransactionRecord[]
  splits: SplitWithTransaction[]
  resolvePersonName: (split: SplitWithTransaction) => string
}): SplitDebtSummary {
  const { anchorTransaction, siblingTransactions, splits, resolvePersonName } = input

  const installmentsTotal = anchorTransaction.installmentsTotal
  const purchaseTotalCentavos = resolveInstallmentPurchaseTotalCentavos(
    siblingTransactions,
    installmentsTotal
  )
  const currentInstallmentAmountCentavos = resolveInstallmentAmountCentavos(
    anchorTransaction,
    purchaseTotalCentavos,
    installmentsTotal
  )

  const splitsTotalCentavos = splits.reduce((sum, split) => sum + split.amount, 0n)
  const myShareTotalCentavos = purchaseTotalCentavos - splitsTotalCentavos

  const keys = [...new Set(splits.map(split => personKey(split)))]
  const persons = keys.map(key => {
    const personSplits = splits.filter(split => personKey(split) === key)
    const sample = personSplits[0]!
    const owed = personSplits.reduce((sum, split) => sum + split.amount, 0n)
    const paid = personSplits.reduce((sum, split) => sum + split.paidAmount, 0n)

    return {
      key,
      name: resolvePersonName(sample),
      userId: sample.userId,
      contactName: sample.contactName,
      contactPhone: sample.contactPhone,
      totalOwed: centavosToString(owed)!,
      totalPaid: centavosToString(paid)!,
      totalRemaining: centavosToString(owed - paid)!,
      status: aggregateStatus(personSplits.map(split => split.status)),
      installments: personSplits
        .map(split => ({
          installmentNumber: split.installmentNumber ?? 1,
          transactionId: split.transactionId,
          transactionAmount: centavosToString(split.transactionAmount)!,
          splitId: split.id,
          amount: centavosToString(split.amount)!,
          paidAmount: centavosToString(split.paidAmount)!,
          status: split.status,
        }))
        .sort((a, b) => a.installmentNumber - b.installmentNumber),
    }
  })

  return {
    purchaseTotal: centavosToString(purchaseTotalCentavos)!,
    myShareTotal: centavosToString(myShareTotalCentavos < 0n ? 0n : myShareTotalCentavos)!,
    installmentsTotal: anchorTransaction.installmentsTotal,
    currentInstallmentNumber: anchorTransaction.installmentNumber,
    currentTransactionAmount: centavosToString(currentInstallmentAmountCentavos),
    persons,
  }
}
