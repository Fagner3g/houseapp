import type { BillingCycle } from '../billing-cycle/index'

export type TransactionLike = {
  title?: string | null
  amount: string | null
  type: string
  date: string
  competenceDate?: string | null
  statementId?: string | null
  source?: string | null
}

export type InvoiceStatementLike = {
  id?: string
  previousBalance?: string | null
  purchasesTotal?: string | null
  paymentsReceived?: string | null
  totalAmount?: string | null
  isClosed?: boolean | null
  isPaid?: boolean | null
  periodStart?: string | null
  periodEnd?: string | null
  dueDate?: string | null
  importSource?: string | null
}

export type InvoiceMetrics = {
  previousBalance: bigint
  purchases: bigint
  invoiceTotal: bigint
  payments: bigint
  remaining: bigint
  usesImportedStatementPeriod: boolean
}

export type InvoiceAmountReconciliation = {
  purchases: bigint
  previousBalance: bigint
  invoiceCredits: bigint
  invoiceCharges: bigint
}

export type InvoiceAdjustmentLine = {
  title: string
  amount: bigint
}

export type CreditCardReportScope = {
  statementId?: string
  excludeImported?: boolean
}

export type PaymentPeriodContext = {
  previousStatement?: InvoiceStatementLike | null
  /** Next cycle statement — previousBalance 0 means this invoice was paid at the bank. */
  nextStatement?: InvoiceStatementLike | null
  closingDay?: number
  dueDay?: number
}

export type BillingCycleLike = Pick<
  BillingCycle,
  'monthKey' | 'periodStart' | 'periodEnd' | 'dueDate'
>
