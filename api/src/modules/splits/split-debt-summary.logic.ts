import {
  extrapolateInstallmentSeriesTotalCentavos,
  resolvePersonShareInstallmentAmountCentavos,
  shouldExtrapolateInstallmentSplitTotals as shouldExtrapolateInstallmentSplitTotalsKernel,
} from '@houseapp/finance-core'

import { centavosToString, divideCentavos } from '@/core/money'
import { stripInstallmentBaseTitle } from '@/modules/transactions/credit-card-installments.logic'
import type { TransactionRecord } from '@/modules/transactions/transaction.repository'

import type { SplitRecord } from './split.repository'

export {
  extrapolateInstallmentSeriesTotalCentavos,
  resolvePersonShareInstallmentAmountCentavos,
}

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
  purchaseTotalIsEstimate: boolean
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

export function isInstallmentPurchaseTotalEstimate(
  siblingTransactions: unknown[],
  installmentsTotal: number | null
): boolean {
  if (installmentsTotal == null || installmentsTotal < 2) return false
  return siblingTransactions.length < installmentsTotal
}

export function resolveInstallmentPurchaseTotalCentavos(
  siblingTransactions: Pick<TransactionRecord, 'amount'>[],
  installmentsTotal: number | null,
  anchor?: Pick<TransactionRecord, 'amount' | 'source' | 'statementId'>
): bigint {
  const sum = siblingTransactions.reduce((total, row) => total + (row.amount ?? 0n), 0n)

  if (installmentsTotal == null || installmentsTotal < 2) {
    return sum
  }

  if (siblingTransactions.length === 1) {
    const single = siblingTransactions[0]?.amount ?? 0n
    if (anchor && isImportedStatementTransaction(anchor)) {
      return single * BigInt(installmentsTotal)
    }
    return single
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

function isImportedStatementTransaction(
  transaction: Pick<TransactionRecord, 'source' | 'statementId'>
): boolean {
  return transaction.source === 'import' && transaction.statementId != null
}

/** Bank imports store each installment amount on its own row; manual entries may store the full purchase on parcel 1. */
export function shouldUseAnchorInstallmentAmount(
  anchorTransaction: Pick<TransactionRecord, 'source' | 'statementId'>,
  siblingTransactions: Pick<TransactionRecord, 'amount'>[]
): boolean {
  if (isImportedStatementTransaction(anchorTransaction)) {
    return true
  }

  if (siblingTransactions.length > 1) {
    const amounts = siblingTransactions.map(row => row.amount ?? 0n)
    const firstAmount = amounts[0] ?? 0n
    return !amounts.every(amount => amount === firstAmount)
  }

  return false
}

export function resolveInstallmentAmountCentavos(
  anchorTransaction: Pick<
    TransactionRecord,
    'amount' | 'installmentNumber' | 'source' | 'statementId'
  >,
  siblingTransactions: Pick<TransactionRecord, 'amount'>[],
  purchaseTotalCentavos: bigint,
  installmentsTotal: number | null
): bigint | null {
  if (anchorTransaction.amount == null) return null
  if (installmentsTotal == null || installmentsTotal < 2) {
    return anchorTransaction.amount
  }

  if (shouldUseAnchorInstallmentAmount(anchorTransaction, siblingTransactions)) {
    return anchorTransaction.amount
  }

  const installmentNumber = anchorTransaction.installmentNumber ?? 1
  const amounts = divideCentavos(purchaseTotalCentavos, installmentsTotal)
  return amounts[installmentNumber - 1] ?? anchorTransaction.amount
}

export function shouldExtrapolateInstallmentSplitTotals(
  anchorTransaction: Pick<TransactionRecord, 'source' | 'statementId'>,
  siblingTransactions: unknown[],
  materializedInstallmentSplitCount: number,
  installmentsTotal: number | null
): boolean {
  return shouldExtrapolateInstallmentSplitTotalsKernel({
    isImportedStatement: isImportedStatementTransaction(anchorTransaction),
    siblingCount: siblingTransactions.length,
    materializedInstallmentSplitCount,
    installmentsTotal,
  })
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
    installmentsTotal,
    anchorTransaction
  )
  const purchaseTotalIsEstimate = isInstallmentPurchaseTotalEstimate(
    siblingTransactions,
    installmentsTotal
  )
  const currentInstallmentAmountCentavos = resolveInstallmentAmountCentavos(
    anchorTransaction,
    siblingTransactions,
    purchaseTotalCentavos,
    installmentsTotal
  )

  const materializedInstallmentSplitCount = new Set(
    splits.map(split => split.installmentNumber ?? 1)
  ).size
  const shouldExtrapolate = shouldExtrapolateInstallmentSplitTotals(
    anchorTransaction,
    siblingTransactions,
    materializedInstallmentSplitCount,
    installmentsTotal
  )

  const materializedSplitsTotalCentavos = splits.reduce((sum, split) => sum + split.amount, 0n)
  const extrapolatedSplitsTotalCentavos = shouldExtrapolate
    ? extrapolateInstallmentSeriesTotalCentavos(
        materializedSplitsTotalCentavos,
        materializedInstallmentSplitCount,
        installmentsTotal
      )
    : materializedSplitsTotalCentavos
  const myShareTotalCentavos = purchaseTotalCentavos - extrapolatedSplitsTotalCentavos

  const keys = [...new Set(splits.map(split => personKey(split)))]
  const persons = keys.flatMap(key => {
    const personSplits = splits.filter(split => personKey(split) === key)
    const sample = personSplits[0]
    if (!sample) return []

    const materializedOwed = personSplits.reduce((sum, split) => sum + split.amount, 0n)
    const paid = personSplits.reduce((sum, split) => sum + split.paidAmount, 0n)
    const personMaterializedInstallmentCount = new Set(
      personSplits.map(split => split.installmentNumber ?? 1)
    ).size
    const owed = shouldExtrapolate
      ? extrapolateInstallmentSeriesTotalCentavos(
          materializedOwed,
          personMaterializedInstallmentCount,
          installmentsTotal
        )
      : materializedOwed

    return [
      {
        key,
        name: resolvePersonName(sample),
        userId: sample.userId,
        contactName: sample.contactName,
        contactPhone: sample.contactPhone,
        totalOwed: centavosToString(owed) ?? '0.00',
        totalPaid: centavosToString(paid) ?? '0.00',
        totalRemaining: centavosToString(owed - paid) ?? '0.00',
        status: aggregateStatus(personSplits.map(split => split.status)),
        installments: personSplits
          .map(split => ({
            installmentNumber: split.installmentNumber ?? 1,
            transactionId: split.transactionId,
            transactionAmount: centavosToString(split.transactionAmount) ?? '0.00',
            splitId: split.id,
            amount: centavosToString(split.amount) ?? '0.00',
            paidAmount: centavosToString(split.paidAmount) ?? '0.00',
            status: split.status,
          }))
          .sort((a, b) => a.installmentNumber - b.installmentNumber),
      },
    ]
  })

  return {
    purchaseTotal: centavosToString(purchaseTotalCentavos) ?? '0.00',
    purchaseTotalIsEstimate,
    myShareTotal: centavosToString(myShareTotalCentavos < 0n ? 0n : myShareTotalCentavos) ?? '0.00',
    installmentsTotal: anchorTransaction.installmentsTotal,
    currentInstallmentNumber: anchorTransaction.installmentNumber,
    currentTransactionAmount: centavosToString(currentInstallmentAmountCentavos),
    persons,
  }
}
