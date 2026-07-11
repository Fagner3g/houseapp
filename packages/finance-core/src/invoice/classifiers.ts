import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import 'dayjs/locale/pt-br'

import type { BillingCycle } from '../billing-cycle/index'
import type { TransactionLike } from './types'

dayjs.extend(customParseFormat)

const IMPORTED_BILL_PAYMENT_TITLE_PATTERN =
  /pagamento recebido|pagamento debito automatico|pagamento efetuado/i

const CARD_STATEMENT_CREDIT_TITLE_PATTERN =
  /pagamento recebido|pagamento em|pagamento debito automatico|pagamento efetuado|crédito de confiança|credito de confianca|estorno|reversão|reversao|iof de volta/i

export function isInvoicePaymentTitle(title: string): boolean {
  return /pagamento fatura/i.test(title)
}

export function isImportedBillPaymentTitle(title: string | null | undefined): boolean {
  return IMPORTED_BILL_PAYMENT_TITLE_PATTERN.test(title ?? '')
}

/** OFX/CSV/XLSX card credits that should not receive spending categories (bill payment, refunds, etc.). */
export function isCardStatementCreditTitle(title: string | null | undefined): boolean {
  return CARD_STATEMENT_CREDIT_TITLE_PATTERN.test(title ?? '')
}

export function isImportedBillPayment(tx: { title?: string | null }): boolean {
  return isImportedBillPaymentTitle(tx.title)
}

export function isInvoiceSettlementCreditTitle(title: string | null | undefined): boolean {
  const normalized = title ?? ''
  if (IMPORTED_BILL_PAYMENT_TITLE_PATTERN.test(normalized)) return false
  if (/pagamento em/i.test(normalized)) return false
  if (/reversão do crédito|reversao do credito/i.test(normalized)) return false

  return /crédito de confiança|credito de confianca|estorno|reversão|reversao|iof de volta/i.test(
    normalized
  )
}

export function isImportedInvoiceSettlementCredit(tx: { title?: string | null }): boolean {
  return isInvoiceSettlementCreditTitle(tx.title)
}

/** HouseApp bookkeeping entry — not an imported OFX bill-payment line. */
export function isAppBookkeepingInvoicePayment(tx: { title?: string | null }): boolean {
  return isInvoicePaymentTitle(tx.title ?? '') && !isImportedBillPayment(tx)
}

export function parseInvoicePaymentMonthKey(title: string): string | null {
  if (!isInvoicePaymentTitle(title)) return null

  const match = title.match(/\s[-–—]\s*([^-–—]+)$/i)
  if (!match) return null

  const label = match[1].trim()
  const formats = ['MMMM YYYY', 'MMMM [de] YYYY']
  for (const format of formats) {
    const parsed = dayjs(label, format, 'pt-br', true)
    if (parsed.isValid()) return parsed.format('YYYY-MM')
  }

  return null
}

/** Manual pay-invoice bookkeeping — not the same as an imported OFX bill payment. */
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
