import type { BillingCycle } from '../billing-cycle.ts'
import { isInvoicePayment } from './periods.ts'
import type { InvoiceAdjustmentLine, InvoiceStatementLike, TransactionLike } from './types.ts'
import { isInvoiceStatementAdjustment } from './filters.ts'
import { parseMoneyStringToCentavos } from '../amount.ts'

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

export function listInvoiceAdjustmentCredits(
  transactions: Array<TransactionLike & { source?: string | null }>,
  period: { start: string; end: string },
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null
): InvoiceAdjustmentLine[] {
  return transactions
    .filter(tx => isInvoiceStatementAdjustment(tx, period, cycle, statement))
    .map(tx => ({
      title: formatInvoiceAdjustmentTitle(tx.title ?? ''),
      amount: parseMoneyStringToCentavos(tx.amount),
    }))
    .filter(line => line.amount > 0n)
    .sort((a, b) => (a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : 0))
}

export function isInvoiceBillPaymentLine(
  tx: TransactionLike & { source?: string | null },
  purchasesPeriod: { start: string; end: string },
  paymentPeriod: { start: string; end: string },
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null
): boolean {
  return isInvoicePayment(tx, purchasesPeriod, paymentPeriod, cycle, statement)
}

export function formatInvoiceBillPaymentTitle(title: string): string {
  const normalized = title.trim()
  if (/^pagamento recebido$/i.test(normalized)) return 'Pagamento recebido'
  if (normalized.length > 52) return `${normalized.slice(0, 49)}…`
  return normalized || 'Pagamento na fatura'
}

export function listInvoiceBillPayments(
  transactions: Array<TransactionLike & { source?: string | null }>,
  purchasesPeriod: { start: string; end: string },
  paymentPeriod: { start: string; end: string },
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null
): InvoiceAdjustmentLine[] {
  return transactions
    .filter(tx =>
      isInvoiceBillPaymentLine(tx, purchasesPeriod, paymentPeriod, cycle, statement)
    )
    .map(tx => ({
      title: formatInvoiceBillPaymentTitle(tx.title ?? ''),
      amount: parseMoneyStringToCentavos(tx.amount),
    }))
    .filter(line => line.amount > 0n)
    .sort((a, b) => (a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : 0))
}

export function resolveUnlistedInvoiceCredits(
  invoiceCredits: bigint,
  creditLines: InvoiceAdjustmentLine[]
): bigint {
  const listed = creditLines.reduce((sum, line) => sum + line.amount, 0n)
  const gap = invoiceCredits - listed
  return gap >= 100n ? gap : 0n
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
