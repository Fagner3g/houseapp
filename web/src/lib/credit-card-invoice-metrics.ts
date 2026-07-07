import type { BillingCycle } from '@/lib/billing-cycle'
import { reaisToCents } from '@/lib/currency'
import {
  buildCreditCardReportScope as buildCreditCardReportScopeKernel,
  centavosToReaisNumber,
  computeInvoiceAmountReconciliation as computeInvoiceAmountReconciliationKernel,
  computeInvoiceMetrics as computeInvoiceMetricsKernel,
  computePersonalSpendAdjustment as computePersonalSpendAdjustmentKernel,
  derivePreviousBalance as derivePreviousBalanceKernel,
  filterTransactionsForInvoiceCycle as filterTransactionsForInvoiceCycleKernel,
  formatInvoiceAdjustmentTitle,
  formatInvoiceBillPaymentTitle,
  getUnlistedInvoiceCreditsCopy,
  hasImportedInvoiceTotal,
  hasStoredInvoiceSummary,
  isAppBookkeepingInvoicePayment,
  isCrossStatementBillPaymentForInvoice,
  isImportedBillPayment,
  isImportedInvoiceSettlementCredit,
  isInvoiceBillPaymentLine,
  isInvoicePayment,
  isInvoiceStatementAdjustment,
  isManualAppInvoicePayment,
  isForeignManualInvoicePayment,
  isNetImportedInvoiceTotal as isNetImportedInvoiceTotalKernel,
  isWithinBillingRange,
  listInvoiceAdjustmentCredits as listInvoiceAdjustmentCreditsKernel,
  listInvoiceBillPayments as listInvoiceBillPaymentsKernel,
  resolvePaymentPeriod,
  resolvePurchasesPeriod,
  resolveUnlistedInvoiceCredits as resolveUnlistedInvoiceCreditsKernel,
  sumManualPurchasesInPeriod,
  transactionPurchaseDate,
  transactionsOwnedByInvoiceCycle,
  type CreditCardReportScope,
  type InvoiceAdjustmentLine as KernelInvoiceAdjustmentLine,
  type InvoiceAmountReconciliation as KernelInvoiceAmountReconciliation,
  type InvoiceMetrics as KernelInvoiceMetrics,
  type InvoiceStatementLike,
  type PaymentPeriodContext,
} from '@houseapp/finance-core'

export type {
  CreditCardReportScope,
  InvoiceStatementLike,
  PaymentPeriodContext,
}

export type InvoiceMetrics = {
  previousBalance: number
  purchases: number
  invoiceTotal: number
  payments: number
  remaining: number
  usesImportedStatementPeriod: boolean
}

export type InvoiceAmountReconciliation = {
  purchases: number
  previousBalance: number
  invoiceCredits: number
  invoiceCharges: number
}

export type InvoiceAdjustmentLine = {
  title: string
  amount: number
}

function mapMetrics(metrics: KernelInvoiceMetrics): InvoiceMetrics {
  return {
    previousBalance: centavosToReaisNumber(metrics.previousBalance),
    purchases: centavosToReaisNumber(metrics.purchases),
    invoiceTotal: centavosToReaisNumber(metrics.invoiceTotal),
    payments: centavosToReaisNumber(metrics.payments),
    remaining: centavosToReaisNumber(metrics.remaining),
    usesImportedStatementPeriod: metrics.usesImportedStatementPeriod,
  }
}

function mapAdjustmentLines(lines: KernelInvoiceAdjustmentLine[]): InvoiceAdjustmentLine[] {
  return lines.map(line => ({
    title: line.title,
    amount: centavosToReaisNumber(line.amount),
  }))
}

function mapReconciliation(
  value: KernelInvoiceAmountReconciliation
): InvoiceAmountReconciliation {
  return {
    purchases: centavosToReaisNumber(value.purchases),
    previousBalance: centavosToReaisNumber(value.previousBalance),
    invoiceCredits: centavosToReaisNumber(value.invoiceCredits),
    invoiceCharges: centavosToReaisNumber(value.invoiceCharges),
  }
}

export {
  buildCreditCardReportScopeKernel as buildCreditCardReportScope,
  formatInvoiceAdjustmentTitle,
  formatInvoiceBillPaymentTitle,
  getUnlistedInvoiceCreditsCopy,
  hasImportedInvoiceTotal,
  hasStoredInvoiceSummary,
  isAppBookkeepingInvoicePayment,
  isCrossStatementBillPaymentForInvoice,
  isImportedBillPayment,
  isImportedInvoiceSettlementCredit,
  isInvoiceBillPaymentLine,
  isInvoicePayment,
  isInvoiceStatementAdjustment,
  isManualAppInvoicePayment,
  isForeignManualInvoicePayment,
  isWithinBillingRange,
  resolvePaymentPeriod,
  resolvePurchasesPeriod,
  sumManualPurchasesInPeriod,
  transactionPurchaseDate,
  transactionsOwnedByInvoiceCycle,
}

export const UNLISTED_INVOICE_CREDITS_LABEL = 'Outros créditos no total do banco'
export const UNLISTED_INVOICE_CREDITS_HINT =
  'O restante já está embutido no valor importado da fatura — o banco descontou, mas não exportou como lançamento no OFX.'

export function derivePreviousBalance(invoiceTotal: number, purchases: number): number {
  return centavosToReaisNumber(
    derivePreviousBalanceKernel(
      BigInt(reaisToCents(invoiceTotal)),
      BigInt(reaisToCents(purchases))
    )
  )
}

export function computeInvoiceAmountReconciliation(input: {
  purchases: number
  previousBalance: number
  invoiceTotal: number
}): InvoiceAmountReconciliation {
  return mapReconciliation(
    computeInvoiceAmountReconciliationKernel({
      purchases: BigInt(reaisToCents(input.purchases)),
      previousBalance: BigInt(reaisToCents(input.previousBalance)),
      invoiceTotal: BigInt(reaisToCents(input.invoiceTotal)),
    })
  )
}

export function computePersonalSpendAdjustment(purchases: number, mySpend: number): number {
  return centavosToReaisNumber(
    computePersonalSpendAdjustmentKernel(
      BigInt(reaisToCents(purchases)),
      BigInt(reaisToCents(mySpend))
    )
  )
}

export function listInvoiceAdjustmentCredits(
  transactions: Parameters<typeof listInvoiceAdjustmentCreditsKernel>[0],
  period: Parameters<typeof listInvoiceAdjustmentCreditsKernel>[1],
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null
): InvoiceAdjustmentLine[] {
  return mapAdjustmentLines(
    listInvoiceAdjustmentCreditsKernel(transactions, period, cycle, statement)
  )
}

export function listInvoiceBillPayments(
  transactions: Parameters<typeof listInvoiceBillPaymentsKernel>[0],
  purchasesPeriod: Parameters<typeof listInvoiceBillPaymentsKernel>[1],
  paymentPeriod: Parameters<typeof listInvoiceBillPaymentsKernel>[2],
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null
): InvoiceAdjustmentLine[] {
  return mapAdjustmentLines(
    listInvoiceBillPaymentsKernel(
      transactions,
      purchasesPeriod,
      paymentPeriod,
      cycle,
      statement
    )
  )
}

export function resolveUnlistedInvoiceCredits(
  invoiceCredits: number,
  creditLines: InvoiceAdjustmentLine[]
): number {
  return centavosToReaisNumber(
    resolveUnlistedInvoiceCreditsKernel(
      BigInt(reaisToCents(invoiceCredits)),
      creditLines.map(line => ({
        title: line.title,
        amount: BigInt(reaisToCents(line.amount)),
      }))
    )
  )
}

export function filterTransactionsForInvoiceCycle<T extends Parameters<
  typeof filterTransactionsForInvoiceCycleKernel
>[0][number]>(
  transactions: T[],
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null,
  context?: PaymentPeriodContext
): T[] {
  return filterTransactionsForInvoiceCycleKernel(transactions, cycle, statement, context)
}

export function isNetImportedInvoiceTotal(
  invoiceTotal: number,
  purchases: number,
  previousBalance: number,
  payments: number
): boolean {
  return isNetImportedInvoiceTotalKernel(
    BigInt(reaisToCents(invoiceTotal)),
    BigInt(reaisToCents(purchases)),
    BigInt(reaisToCents(previousBalance)),
    BigInt(reaisToCents(payments))
  )
}

export function computeInvoiceMetrics(
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null,
  transactions: Parameters<typeof computeInvoiceMetricsKernel>[2],
  context?: PaymentPeriodContext
): InvoiceMetrics {
  return mapMetrics(computeInvoiceMetricsKernel(cycle, statement, transactions, context))
}
