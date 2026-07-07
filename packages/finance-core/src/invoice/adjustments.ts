import type { BillingCycle } from '../billing-cycle/index'
import { parseMoneyStringToCentavos } from '../money/strings'
import { isInvoiceStatementAdjustment } from './filters'
import { isInvoicePayment } from './periods'
import type { InvoiceAdjustmentLine, InvoiceStatementLike, TransactionLike } from './types'

type TitleFormatter = (title: string) => string

function truncateTitle(title: string, fallback: string): string {
  const normalized = title.trim()
  if (normalized.length > 52) {
    return `${normalized.slice(0, 49)}…`
  }
  return normalized || fallback
}

const defaultAdjustmentTitle: TitleFormatter = title =>
  truncateTitle(title, 'Invoice credit')

const defaultBillPaymentTitle: TitleFormatter = title =>
  truncateTitle(title, 'Invoice payment')

export function listInvoiceAdjustmentCredits(
  transactions: Array<TransactionLike & { source?: string | null }>,
  period: { start: string; end: string },
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null,
  formatTitle: TitleFormatter = defaultAdjustmentTitle
): InvoiceAdjustmentLine[] {
  return transactions
    .filter(tx => isInvoiceStatementAdjustment(tx, period, cycle, statement))
    .map(tx => ({
      title: formatTitle(tx.title ?? ''),
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

export function listInvoiceBillPayments(
  transactions: Array<TransactionLike & { source?: string | null }>,
  purchasesPeriod: { start: string; end: string },
  paymentPeriod: { start: string; end: string },
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null,
  formatTitle: TitleFormatter = defaultBillPaymentTitle
): InvoiceAdjustmentLine[] {
  return transactions
    .filter(tx =>
      isInvoiceBillPaymentLine(tx, purchasesPeriod, paymentPeriod, cycle, statement)
    )
    .map(tx => ({
      title: formatTitle(tx.title ?? ''),
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
