import { isWithinBillingRange, type BillingCycle } from '../billing-cycle/index'
import { parseMoneyStringToCentavos } from '../money/strings'
import { isImportedInvoiceSettlementCredit } from './classifiers'
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
import { hasStoredInvoiceSummary } from './scope'
import { sumAmounts, sumManualPurchasesInPeriod, transactionsOwnedByInvoiceCycle } from './filters'
import type { InvoiceMetrics, InvoiceStatementLike, PaymentPeriodContext, TransactionLike } from './types'

function sumPaymentsNotInStatement(
  transactions: TransactionLike[],
  purchasesPeriod: { start: string; end: string },
  paymentPeriod: { start: string; end: string },
  statement: InvoiceStatementLike | null,
  cycle: BillingCycle
): bigint {
  const statementId = statement?.id ?? null

  return sumAmounts(
    transactions.filter(
      tx =>
        isInvoicePayment(tx, purchasesPeriod, paymentPeriod, cycle, statement) &&
        (statementId == null || !tx.statementId || tx.statementId !== statementId)
    ),
    'income'
  )
}

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

  let paymentsToDeduct: bigint
  if (statement?.isClosed && !statement?.isPaid && payments > 0n && !isNetImportedTotal) {
    paymentsToDeduct = payments
  } else if (imported && (statement?.importSource === 'ofx' || statement?.importSource === 'xlsx' || isNetImportedTotal)) {
    paymentsToDeduct = sumPaymentsNotInStatement(
      ownedTransactions,
      purchasesPeriod,
      paymentPeriod,
      statement,
      cycle
    )
  } else {
    paymentsToDeduct = payments
  }

  const settlementCredits =
    imported && statement?.isClosed
      ? sumAmounts(
          ownedTransactions.filter(
            tx =>
              tx.type === 'income' &&
              isImportedInvoiceSettlementCredit(tx) &&
              isWithinBillingRange(
                tx.date,
                purchasesPeriod.start,
                purchasesPeriod.end
              )
          ),
          'income'
        )
      : 0n

  const remaining =
    statement?.isClosed && statement?.isPaid
      ? 0n
      : (() => {
          const value = resolvedInvoiceTotal - paymentsToDeduct - settlementCredits
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
