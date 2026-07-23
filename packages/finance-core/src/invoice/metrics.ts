import { isWithinBillingRange, type BillingCycle } from '../billing-cycle/index'
import { parseMoneyStringToCentavos } from '../money/strings'
import {
  hasImportedInvoiceTotal,
  isCrossStatementBillPaymentForInvoice,
  isInvoicePayment,
  resolvePaymentPeriod,
  resolvePurchasesPeriod,
} from './periods'
import { transactionPurchaseDate } from './ranges'
import {
  derivePreviousBalance,
  isNetImportedInvoiceTotal,
  parseStatementMoney,
  resolveComputedInvoiceTotal,
} from './reconciliation'
import { isPriorInvoiceSettledByNextBalance } from './next-statement-settlement'
import { resolveRemainingDeductions } from './remaining'
import { hasStoredInvoiceSummary } from './scope'
import { sumAmounts, sumManualPurchasesInPeriod, transactionsOwnedByInvoiceCycle } from './filters'
import type { InvoiceMetrics, InvoiceStatementLike, PaymentPeriodContext, TransactionLike } from './types'

export function computeInvoiceMetrics(
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null,
  transactions: TransactionLike[],
  context?: PaymentPeriodContext
): InvoiceMetrics {
  const purchasesPeriod = resolvePurchasesPeriod(cycle, statement)
  const paymentPeriod = resolvePaymentPeriod(cycle, statement, context)
  const ownedTransactions = transactionsOwnedByInvoiceCycle(transactions, statement)

  const purchasesFromTx = sumAmounts(
    ownedTransactions.filter(
      t =>
        t.type === 'expense' &&
        isWithinBillingRange(
          transactionPurchaseDate(t),
          purchasesPeriod.start,
          purchasesPeriod.end
        )
    ),
    'expense'
  )

  const paymentsFromTx = sumAmounts(
    ownedTransactions.filter(tx =>
      isInvoicePayment(tx, purchasesPeriod, paymentPeriod, cycle, statement)
    ),
    'income'
  )

  const crossStatementPayments = sumAmounts(
    transactions.filter(tx =>
      isCrossStatementBillPaymentForInvoice(tx, statement, paymentPeriod)
    ),
    'income'
  )

  const allPaymentsFromTx = paymentsFromTx + crossStatementPayments

  const imported = hasImportedInvoiceTotal(statement)
  const storedSummary = hasStoredInvoiceSummary(statement)
  const invoiceTotal = imported ? parseStatementMoney(statement?.totalAmount) : 0n
  const manualPurchases =
    imported && storedSummary
      ? sumManualPurchasesInPeriod(
          ownedTransactions,
          purchasesPeriod.start,
          purchasesPeriod.end
        )
      : 0n

  const purchases = imported
    ? storedSummary
      ? parseMoneyStringToCentavos(statement?.purchasesTotal) + manualPurchases
      : purchasesFromTx
    : purchasesFromTx

  const previousBalance = imported
    ? storedSummary
      ? parseMoneyStringToCentavos(statement?.previousBalance)
      : derivePreviousBalance(invoiceTotal, purchases)
    : parseMoneyStringToCentavos(statement?.previousBalance)

  const resolvedInvoiceTotal = resolveComputedInvoiceTotal(
    imported,
    invoiceTotal,
    manualPurchases,
    previousBalance,
    purchases
  )

  const payments = imported
    ? allPaymentsFromTx > 0n
      ? allPaymentsFromTx
      : statement?.paymentsReceived != null
        ? parseMoneyStringToCentavos(statement.paymentsReceived)
        : allPaymentsFromTx
    : allPaymentsFromTx

  const isNetImportedTotal =
    imported &&
    (statement?.importSource === 'ofx' || statement?.importSource === 'xlsx') &&
    isNetImportedInvoiceTotal(resolvedInvoiceTotal, purchases, previousBalance, payments)

  const { paymentsToDeduct, settlementCreditsToDeduct } = resolveRemainingDeductions({
    imported,
    statement,
    cycle,
    ownedTransactions,
    purchasesPeriod,
    paymentPeriod,
    resolvedInvoiceTotal,
    purchases,
    previousBalance,
    payments,
    crossStatementPayments,
    isNetImportedTotal,
  })

  const settledByNextStatement = isPriorInvoiceSettledByNextBalance(
    context?.nextStatement?.previousBalance
  )

  const remaining =
    (statement?.isClosed && statement?.isPaid) || settledByNextStatement
      ? 0n
      : (() => {
          const value = resolvedInvoiceTotal - paymentsToDeduct - settlementCreditsToDeduct
          return value > 0n ? value : 0n
        })()

  return {
    previousBalance,
    purchases,
    invoiceTotal: resolvedInvoiceTotal,
    payments,
    remaining,
    usesImportedStatementPeriod: purchasesPeriod.usesImportedStatementPeriod,
  }
}
