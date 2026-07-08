import { formatCentavos, parseCentavos, parseMoneyStringToCentavos } from '@houseapp/finance-core'

import {
  cleanTransactionTitle,
  formatAmountBRL,
  formatAmountDigitsBRL,
} from './format'

function divideMoneyString(value: string, divisor: number): string | null {
  if (divisor < 1) return null
  try {
    return formatCentavos(parseCentavos(value) / BigInt(divisor))
  } catch {
    return null
  }
}

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
  installmentNumber?: number | null
  installmentsTotal?: number | null
}): string | null {
  const shareAmount = formatAmountBRL(input.shareAmount)
  if (!shareAmount) return null

  const hasInstallments = !!(
    input.installmentNumber &&
    input.installmentsTotal &&
    input.installmentsTotal >= 2
  )

  let line = hasInstallments
    ? `Sua parte: ${shareAmount} (${input.installmentNumber}/${input.installmentsTotal})`
    : `Sua parte: ${shareAmount}`

  const shareTotalDigits = formatAmountDigitsBRL(input.shareTotalAmount)
  if (
    shareTotalDigits &&
    input.shareTotalAmount &&
    input.shareAmount &&
    input.shareTotalAmount !== input.shareAmount
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
}): string | null {
  const splitTotal = formatAmountBRL(input.splitAmount)
  const splitRemaining = formatAmountBRL(input.splitRemainingAmount)
  const dueAmount = formatAmountBRL(input.amount)
  const hasInstallments = !!(
    input.installmentNumber &&
    input.installmentsTotal &&
    input.installmentsTotal >= 2
  )
  const isSplit = !!input.isSplit
  const hasPartialPayment = isSplit && parseMoneyStringToCentavos(input.splitPaidAmount) > 0n

  if (hasInstallments && input.installmentsTotal && input.installmentNumber) {
    if (isSplit) {
      const shareAmount =
        input.splitShareInstallmentAmount ??
        (input.splitAmount
          ? divideMoneyString(input.splitAmount, input.installmentsTotal)
          : null)

      return buildSplitShareSummaryLine({
        shareAmount,
        shareTotalAmount: input.splitAmount,
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
        shareAmount: input.splitAmount ?? input.amount,
      }) ?? dueAmount
    )
  }

  return dueAmount
}
