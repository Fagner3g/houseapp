import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import 'dayjs/locale/pt-br'

import type { BillingCycle } from '../billing-cycle.ts'
import type { TransactionLike } from './types.ts'

dayjs.extend(customParseFormat)

export function isInvoicePaymentTitle(title: string): boolean {
  return /pagamento fatura/i.test(title)
}

export function isImportedBillPaymentTitle(title: string | null | undefined): boolean {
  return /pagamento recebido/i.test(title ?? '')
}

export function isImportedBillPayment(tx: { title?: string | null }): boolean {
  return isImportedBillPaymentTitle(tx.title)
}

export function isInvoiceSettlementCreditTitle(title: string | null | undefined): boolean {
  const normalized = title ?? ''
  if (/pagamento recebido|pagamento em/i.test(normalized)) return false
  if (/reversão do crédito|reversao do credito/i.test(normalized)) return false

  return /crédito de confiança|credito de confianca|estorno|reversão|reversao|iof de volta/i.test(
    normalized
  )
}

export function isImportedInvoiceSettlementCredit(tx: { title?: string | null }): boolean {
  return isInvoiceSettlementCreditTitle(tx.title)
}

/** HouseApp bookkeeping entry — not an OFX "Pagamento recebido" line. */
export function isAppBookkeepingInvoicePayment(tx: { title?: string | null }): boolean {
  return isInvoicePaymentTitle(tx.title ?? '') && !isImportedBillPayment(tx)
}

export function parseInvoicePaymentMonthKey(title: string): string | null {
  if (!isInvoicePaymentTitle(title)) return null

  const match = title.match(/\s[-–—]\s*([^-–—]+)$/i)
  if (!match) return null

  const label = match[1].trim()
  const parsed = dayjs(label, 'MMMM YYYY', 'pt-br', true)
  if (!parsed.isValid()) return null

  return parsed.format('YYYY-MM')
}

/** Bookkeeping entry from "Pagar fatura" — not the same as OFX "Pagamento recebido". */
export function isManualAppInvoicePayment(
  tx: TransactionLike & { source?: string | null }
): boolean {
  return (
    tx.type === 'income' &&
    tx.source === 'manual' &&
    !tx.statementId &&
    isAppBookkeepingInvoicePayment(tx)
  )
}

/** Manual pay-invoice for another billing month (e.g. June payment showing in July OFX period). */
export function isForeignManualInvoicePayment(
  tx: TransactionLike & { source?: string | null },
  cycle: BillingCycle
): boolean {
  if (!isManualAppInvoicePayment(tx)) return false
  const monthKey = parseInvoicePaymentMonthKey(tx.title ?? '')
  return monthKey != null && monthKey !== cycle.monthKey
}

function isCreditReversalTitle(title: string): boolean {
  return /reversão do crédito|reversao do credito/i.test(title)
}

export { isCreditReversalTitle }
