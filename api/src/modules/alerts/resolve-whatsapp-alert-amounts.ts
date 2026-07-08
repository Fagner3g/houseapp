import { centavosToString } from '@/core/money'
import {
  matchesInstallmentSeries,
  resolveInstallmentAmountCentavos,
  resolveInstallmentPurchaseTotalCentavos,
} from '@/modules/splits/split-debt-summary.logic'
import type { TransactionRecord } from '@/modules/transactions/transaction.repository'

export type WhatsAppAlertAmounts = {
  amount: string | null
  transactionTotalAmount: string | null
  installmentAmount: string | null
  splitAmount: string | null
  splitShareInstallmentAmount?: string | null
  splitPaidAmount?: string | null
  splitRemainingAmount?: string | null
  /** Debtors + owner when the purchase is split. */
  splitParticipantCount?: number | null
}

type TransactionAmountInput = Pick<
  TransactionRecord,
  'amount' | 'installmentNumber' | 'installmentsTotal' | 'source' | 'statementId'
>

export function resolveWhatsAppAlertAmounts(input: {
  transaction: TransactionAmountInput
  siblingTransactions: TransactionAmountInput[]
  isSplit?: boolean
  amountOverride?: string | null
}): WhatsAppAlertAmounts {
  const { transaction, siblingTransactions, isSplit, amountOverride } = input

  const purchaseTotalCentavos = resolveInstallmentPurchaseTotalCentavos(
    siblingTransactions,
    transaction.installmentsTotal,
    transaction
  )
  const installmentAmountCentavos = resolveInstallmentAmountCentavos(
    transaction,
    siblingTransactions,
    purchaseTotalCentavos,
    transaction.installmentsTotal
  )

  const splitAmount = isSplit ? (amountOverride ?? null) : null
  const amountDue =
    splitAmount ??
    (transaction.amount != null ? centavosToString(transaction.amount) : null)

  const hasInstallments =
    transaction.installmentsTotal != null && transaction.installmentsTotal >= 2

  return {
    amount: amountDue,
    transactionTotalAmount: centavosToString(purchaseTotalCentavos),
    installmentAmount: hasInstallments ? centavosToString(installmentAmountCentavos) : null,
    splitAmount,
  }
}

export function filterInstallmentSiblings<
  T extends Pick<
    TransactionRecord,
    'title' | 'installmentsTotal' | 'accountId' | 'cardId' | 'organizationId'
  >,
>(candidates: T[], anchor: T): T[] {
  return candidates.filter(candidate => matchesInstallmentSeries(candidate, anchor))
}
