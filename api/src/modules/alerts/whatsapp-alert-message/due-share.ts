import { formatCentavos, parseCentavos, parseMoneyStringToCentavos } from '@houseapp/finance-core'

import { formatAmountBRL } from './format'

function divideMoneyString(value: string, divisor: number): string | null {
  if (divisor < 1) return null
  try {
    return formatCentavos(parseCentavos(value) / BigInt(divisor))
  } catch {
    return null
  }
}

/** Amount the recipient owes for this alert cycle (split share for the current bill). */
export function resolveDueShareAmount(input: {
  amount?: string | null
  splitAmount?: string | null
  splitShareInstallmentAmount?: string | null
  splitPaidAmount?: string | null
  splitRemainingAmount?: string | null
  installmentNumber?: number | null
  installmentsTotal?: number | null
  isSplit?: boolean
  collectLumpSum?: boolean | null
}): string | null {
  if (!input.isSplit) return null

  if (input.collectLumpSum) {
    return input.splitShareInstallmentAmount ?? input.splitAmount ?? input.amount ?? null
  }

  const hasInstallments = !!(
    input.installmentNumber &&
    input.installmentsTotal &&
    input.installmentsTotal >= 2
  )
  const hasPartialPayment = parseMoneyStringToCentavos(input.splitPaidAmount) > 0n

  if (hasInstallments && input.installmentsTotal) {
    return (
      input.splitShareInstallmentAmount ??
      (input.splitAmount ? divideMoneyString(input.splitAmount, input.installmentsTotal) : null) ??
      input.amount ??
      null
    )
  }

  if (hasPartialPayment && input.splitRemainingAmount) {
    return input.splitRemainingAmount
  }

  return input.splitAmount ?? input.amount ?? null
}

export function sumDueShareCentavos(
  items: Array<Parameters<typeof resolveDueShareAmount>[0]>
): bigint {
  return items.reduce((sum, item) => {
    const share = resolveDueShareAmount(item)
    return sum + parseMoneyStringToCentavos(share)
  }, 0n)
}

export function buildCreditCardShareTotalLine(centavos: bigint): string | null {
  if (centavos <= 0n) return null
  const amount = formatAmountBRL(formatCentavos(centavos))
  return amount ? `💰 Sua parte neste cartão: ${amount}` : null
}

export function buildGrandShareTotalLine(centavos: bigint): string | null {
  if (centavos <= 0n) return null
  const amount = formatAmountBRL(formatCentavos(centavos))
  return amount ? `💰 Total da sua parte: ${amount}` : null
}

export { divideMoneyString }
