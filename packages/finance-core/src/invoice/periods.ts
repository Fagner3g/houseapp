import dayjs from 'dayjs'

import {
  getBillingCycle,
  isWithinBillingRange,
  shiftBillingMonth,
  type BillingCycle,
} from '../billing-cycle/index'
import {
  isAppBookkeepingInvoicePayment,
  isForeignManualInvoicePayment,
  isImportedBillPayment,
} from './classifiers'
import type { InvoiceStatementLike, PaymentPeriodContext, TransactionLike } from './types'

/** OFX/PDF totals are authoritative even mid-cycle; CSV exports stay provisional until closed. */
export function hasImportedInvoiceTotal(statement: InvoiceStatementLike | null): boolean {
  if (!statement?.totalAmount) return false
  if (statement.isClosed) return true
  return statement.importSource === 'ofx' || statement.importSource === 'pdf'
}

/** Purchase window: OFX period when imported, otherwise the account billing cycle. */
export function resolvePurchasesPeriod(
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null
): { start: string; end: string; usesImportedStatementPeriod: boolean } {
  if (hasImportedInvoiceTotal(statement) && statement?.periodStart && statement?.periodEnd) {
    return {
      start: statement.periodStart,
      end: statement.periodEnd,
      usesImportedStatementPeriod: true,
    }
  }

  return {
    start: cycle.periodStart,
    end: cycle.periodEnd,
    usesImportedStatementPeriod: false,
  }
}

function resolvePreviousDueDate(
  cycle: BillingCycle,
  context?: PaymentPeriodContext
): string | null {
  if (context?.previousStatement?.dueDate) {
    return context.previousStatement.dueDate
  }

  if (context?.closingDay != null && context?.dueDay != null) {
    const previousCycle = getBillingCycle(
      context.closingDay,
      context.dueDay,
      shiftBillingMonth(cycle.monthKey, -1)
    )
    return previousCycle.dueDate
  }

  return null
}

/** Payment window: day after previous invoice due → current due (supports early payment before closing). */
export function resolvePaymentPeriod(
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null,
  context?: PaymentPeriodContext
): { start: string; end: string } {
  const end =
    hasImportedInvoiceTotal(statement) && statement?.dueDate ? statement.dueDate : cycle.dueDate

  const previousDue = resolvePreviousDueDate(cycle, context)
  const start = previousDue
    ? dayjs(previousDue).add(1, 'day').format('YYYY-MM-DD')
    : cycle.periodStart

  return { start, end }
}

function shouldIncludeIncomeInImportedInvoiceList(
  tx: TransactionLike & { source?: string | null },
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null
): boolean {
  if (isAppBookkeepingInvoicePayment(tx)) {
    if (isForeignManualInvoicePayment(tx, cycle)) return false
    if (hasImportedInvoiceTotal(statement)) return false
  }

  return true
}

export function isInvoicePayment(
  tx: TransactionLike,
  purchasesPeriod: { start: string; end: string },
  paymentPeriod: { start: string; end: string },
  cycle?: BillingCycle,
  statement?: InvoiceStatementLike | null
) {
  if (tx.type !== 'income') return false
  if (cycle && isForeignManualInvoicePayment(tx, cycle)) return false
  if (hasImportedInvoiceTotal(statement ?? null) && isAppBookkeepingInvoicePayment(tx)) {
    return false
  }
  if (!isWithinBillingRange(tx.date, paymentPeriod.start, paymentPeriod.end)) return false

  if (isImportedBillPayment(tx)) return true

  const duringPurchases = isWithinBillingRange(
    tx.date,
    purchasesPeriod.start,
    purchasesPeriod.end
  )
  if (duringPurchases && tx.statementId) return false

  return true
}

/** Bill payment imported on the next OFX and linked to the following statement. */
export function isCrossStatementBillPaymentForInvoice(
  tx: TransactionLike,
  statement: InvoiceStatementLike | null,
  paymentPeriod: { start: string; end: string }
): boolean {
  if (!statement?.id || !tx.statementId || tx.statementId === statement.id) return false
  if (tx.type !== 'income' || !isImportedBillPayment(tx)) return false
  return isWithinBillingRange(tx.date, paymentPeriod.start, paymentPeriod.end)
}

export { shouldIncludeIncomeInImportedInvoiceList }
