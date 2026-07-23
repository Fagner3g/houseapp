import { parseMoneyStringToCentavos } from '@houseapp/finance-core'

import {
  cleanTransactionTitle,
  formatAmountBRL,
  formatAmountDigitsBRL,
} from './format'
import { divideMoneyString, resolveDueShareAmount } from './due-share'

function buildInstallmentSummaryLine(input: {
  installmentNumber: number
  installmentsTotal: number
  installmentAmount?: string | null
  totalAmount?: string | null
}): string | null {
  const amount = formatAmountBRL(
    input.installmentAmount ??
      (input.totalAmount ? divideMoneyString(input.totalAmount, input.installmentsTotal) : null)
  )
  if (!amount) return null
  return `${input.installmentNumber}/${input.installmentsTotal}: ${amount}`
}

export function buildSplitShareSummaryLine(input: {
  shareAmount?: string | null
  shareTotalAmount?: string | null
  purchaseTotalAmount?: string | null
  installmentNumber?: number | null
  installmentsTotal?: number | null
  collectLumpSum?: boolean | null
}): string | null {
  const shareAmount = formatAmountBRL(input.shareAmount)
  if (!shareAmount) return null

  if (input.collectLumpSum) {
    let line = `Sua parte: ${shareAmount} · à vista`
    const shareTotalDigits = formatAmountDigitsBRL(input.shareTotalAmount)
    const isFullPurchaseShare =
      !!input.shareTotalAmount &&
      !!input.purchaseTotalAmount &&
      input.shareTotalAmount === input.purchaseTotalAmount
    if (
      shareTotalDigits &&
      input.shareTotalAmount &&
      input.shareAmount &&
      input.shareTotalAmount !== input.shareAmount &&
      !isFullPurchaseShare
    ) {
      line = `${line} · ${shareTotalDigits}`
    }
    return line
  }

  const hasInstallments = !!(
    input.installmentNumber &&
    input.installmentsTotal &&
    input.installmentsTotal >= 2
  )

  let line = hasInstallments
    ? `Sua parte: ${shareAmount} (${input.installmentNumber}/${input.installmentsTotal}) · parcelado`
    : `Sua parte: ${shareAmount}`

  // Trailing total is useful for partial splits (e.g. 50/50): "83,75 (1/10) · 837,50".
  // Skip when the person owes 100% of the purchase — it reads as if the installment were R$ 1.000.
  const shareTotalDigits = formatAmountDigitsBRL(input.shareTotalAmount)
  const isFullPurchaseShare =
    !!input.shareTotalAmount &&
    !!input.purchaseTotalAmount &&
    input.shareTotalAmount === input.purchaseTotalAmount

  if (
    shareTotalDigits &&
    input.shareTotalAmount &&
    input.shareAmount &&
    input.shareTotalAmount !== input.shareAmount &&
    !isFullPurchaseShare
  ) {
    line = `${line} · ${shareTotalDigits}`
  }

  return line
}

export function buildSplitTransactionTitleLine(input: {
  title: string
  transactionTotalAmount?: string | null
  isSplit?: boolean
}): string {
  const cleanTitle = cleanTransactionTitle(input.title)
  const purchaseTotal = input.isSplit ? formatAmountBRL(input.transactionTotalAmount) : null
  return purchaseTotal ? `${cleanTitle} · ${purchaseTotal}` : cleanTitle
}

export function buildSummaryLine(input: {
  amount?: string | null
  transactionTotalAmount?: string | null
  installmentAmount?: string | null
  splitAmount?: string | null
  splitShareInstallmentAmount?: string | null
  splitPaidAmount?: string | null
  splitRemainingAmount?: string | null
  splitParticipantCount?: number | null
  installmentNumber?: number | null
  installmentsTotal?: number | null
  isSplit?: boolean
  collectLumpSum?: boolean | null
}): string | null {
  const splitTotal = formatAmountBRL(input.splitAmount)
  const splitRemaining = formatAmountBRL(input.splitRemainingAmount)
  const dueAmount = formatAmountBRL(input.amount)
  const hasInstallments = !!(
    input.installmentNumber &&
    input.installmentsTotal &&
    input.installmentsTotal >= 2 &&
    !input.collectLumpSum
  )
  const isSplit = !!input.isSplit
  const hasPartialPayment = isSplit && parseMoneyStringToCentavos(input.splitPaidAmount) > 0n

  if (hasInstallments && input.installmentsTotal && input.installmentNumber) {
    if (isSplit) {
      return buildSplitShareSummaryLine({
        shareAmount: resolveDueShareAmount(input),
        shareTotalAmount: input.splitAmount,
        purchaseTotalAmount: input.transactionTotalAmount,
        installmentNumber: input.installmentNumber,
        installmentsTotal: input.installmentsTotal,
      })
    }

    return buildInstallmentSummaryLine({
      installmentNumber: input.installmentNumber,
      installmentsTotal: input.installmentsTotal,
      installmentAmount: input.installmentAmount ?? input.amount,
      totalAmount: input.transactionTotalAmount,
    })
  }

  if (isSplit) {
    if (hasPartialPayment && splitRemaining && splitTotal) {
      return `Falta ${splitRemaining} de ${splitTotal}`
    }

    return (
      buildSplitShareSummaryLine({
        shareAmount: resolveDueShareAmount(input),
        collectLumpSum: input.collectLumpSum,
      }) ?? dueAmount
    )
  }

  return dueAmount
}
