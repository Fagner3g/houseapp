/** pt-BR user-facing invoice labels — keep display copy in the web layer, not finance-core. */

export function formatInvoiceAdjustmentTitle(title: string): string {
  const normalized = title.trim()
  const confidenceMatch = normalized.match(/^cr[eé]dito de confian[çc]a de "?(.+?)"?\.?$/i)
  if (confidenceMatch?.[1]) {
    return `Crédito — ${confidenceMatch[1]}`
  }

  if (normalized.length > 52) {
    return `${normalized.slice(0, 49)}…`
  }

  return normalized || 'Crédito na fatura'
}

export function formatInvoiceBillPaymentTitle(title: string): string {
  const normalized = title.trim()
  if (/^pagamento recebido$/i.test(normalized)) return 'Pagamento recebido'
  if (normalized.length > 52) return `${normalized.slice(0, 49)}…`
  return normalized || 'Pagamento na fatura'
}

export function getUnlistedInvoiceCreditsCopy(hasListedCredits: boolean): {
  label: string
  hint: string
  prefix?: string
  emphasis: boolean
} {
  if (hasListedCredits) {
    return {
      label: 'Outros créditos no total do banco',
      hint: 'O restante já está embutido no valor importado da fatura — o banco descontou, mas não exportou como lançamento no OFX.',
      prefix: '=',
      emphasis: true,
    }
  }

  return {
    label: 'Créditos no total importado do banco',
    hint: 'O banco já descontou no valor da fatura, mas não exportou os estornos como lançamentos separados no OFX.',
    emphasis: true,
  }
}

export const UNLISTED_INVOICE_CREDITS_LABEL = 'Outros créditos no total do banco'
export const UNLISTED_INVOICE_CREDITS_HINT =
  'O restante já está embutido no valor importado da fatura — o banco descontou, mas não exportou como lançamento no OFX.'
