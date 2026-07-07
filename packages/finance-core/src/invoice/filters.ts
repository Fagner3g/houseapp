import { parseMoneyStringToCentavos } from '../money/strings'
import { isWithinBillingRange, type BillingCycle } from '../billing-cycle/index'
import {
  isAppBookkeepingInvoicePayment,
  isCreditReversalTitle,
  isForeignManualInvoicePayment,
  isImportedBillPayment,
} from './classifiers'
import {
  isCrossStatementBillPaymentForInvoice,
  isInvoicePayment,
  resolvePaymentPeriod,
  resolvePurchasesPeriod,
  shouldIncludeIncomeInImportedInvoiceList,
} from './periods'
import { transactionPurchaseDate } from './ranges'
import type { InvoiceStatementLike, PaymentPeriodContext, TransactionLike } from './types'

export function transactionsOwnedByInvoiceCycle<T extends TransactionLike>(
  transactions: T[],
  matchedStatement: InvoiceStatementLike | null
): T[] {
  const matchedStatementId = matchedStatement?.id ?? null

  return transactions.filter(tx => {
    if (!tx.statementId) return true
    return matchedStatementId != null && tx.statementId === matchedStatementId
  })
}

export function filterTransactionsForInvoiceCycle<T extends TransactionLike>(
  transactions: T[],
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null,
  context?: PaymentPeriodContext
): T[] {
  const purchasesPeriod = resolvePurchasesPeriod(cycle, statement)
  const paymentPeriod = resolvePaymentPeriod(cycle, statement, context)
  const ownedTransactions = transactionsOwnedByInvoiceCycle(transactions, statement)
  const crossStatementBillPayments = transactions.filter(tx =>
    isCrossStatementBillPaymentForInvoice(tx, statement, paymentPeriod)
  )

  const purchases = ownedTransactions.filter(
    tx =>
      tx.type === 'expense' &&
      isWithinBillingRange(
        transactionPurchaseDate(tx),
        purchasesPeriod.start,
        purchasesPeriod.end
      )
  )

  const matchedStatementId = statement?.id ?? null
  const statementIncome = ownedTransactions.filter(
    tx =>
      tx.type === 'income' &&
      isWithinBillingRange(tx.date, purchasesPeriod.start, purchasesPeriod.end) &&
      (matchedStatementId == null ||
        !tx.statementId ||
        tx.statementId === matchedStatementId) &&
      shouldIncludeIncomeInImportedInvoiceList(tx, cycle, statement)
  )
  const paymentsOutsidePurchases = ownedTransactions.filter(
    tx =>
      isInvoicePayment(tx, purchasesPeriod, paymentPeriod, cycle, statement) &&
      !isWithinBillingRange(tx.date, purchasesPeriod.start, purchasesPeriod.end) &&
      shouldIncludeIncomeInImportedInvoiceList(tx, cycle, statement)
  )

  return [...purchases, ...statementIncome, ...paymentsOutsidePurchases, ...crossStatementBillPayments]
}

export function isInvoiceStatementAdjustment(
  tx: TransactionLike & { source?: string | null },
  period: { start: string; end: string },
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null
): boolean {
  if (tx.type !== 'income') return false
  if (!isWithinBillingRange(transactionPurchaseDate(tx), period.start, period.end)) {
    return false
  }
  if (isCreditReversalTitle(tx.title ?? '')) return false
  if (isImportedBillPayment(tx)) return false
  if (isAppBookkeepingInvoicePayment(tx)) return false
  if (isForeignManualInvoicePayment(tx, cycle)) return false

  const matchedStatementId = statement?.id ?? null
  if (matchedStatementId != null && tx.statementId && tx.statementId !== matchedStatementId) {
    return false
  }

  return true
}

export function sumManualPurchasesInPeriod(
  transactions: TransactionLike[],
  periodStart: string,
  periodEnd: string
): bigint {
  return transactions
    .filter(
      t =>
        t.type === 'expense' &&
        t.source === 'manual' &&
        isWithinBillingRange(transactionPurchaseDate(t), periodStart, periodEnd)
    )
    .reduce((sum, t) => sum + parseMoneyStringToCentavos(t.amount), 0n)
}

function sumAmounts(transactions: TransactionLike[], type: string): bigint {
  return transactions
    .filter(t => t.type === type)
    .reduce((sum, t) => sum + parseMoneyStringToCentavos(t.amount), 0n)
}

export { sumAmounts }
