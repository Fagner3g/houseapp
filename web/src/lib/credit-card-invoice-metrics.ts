import dayjs from 'dayjs'

import type { BillingCycle } from '@/lib/billing-cycle'
import { getBillingCycle, shiftBillingMonth } from '@/lib/billing-cycle'
import { parseInvoicePaymentMonthKey } from '@/lib/invoice-payment'
import { isInvoicePaymentTitle } from '@/lib/transaction-kpi'
import { centsToReais, moneyStringToCents, moneyStringToReais, reaisToCents } from '@/lib/currency'

type TransactionLike = {
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

function parseMoney(value: string | null | undefined): number {
  return moneyStringToReais(value)
}

function sumAmounts(transactions: TransactionLike[], type: string) {
  const totalCents = transactions
    .filter(t => t.type === type)
    .reduce((sum, t) => sum + moneyStringToCents(t.amount), 0)

  return centsToReais(totalCents)
}

export type InvoiceMetrics = {
  previousBalance: number
  purchases: number
  invoiceTotal: number
  payments: number
  remaining: number
  usesImportedStatementPeriod: boolean
}

export function transactionPurchaseDate(tx: { date: string; competenceDate?: string | null }) {
  return tx.competenceDate ?? tx.date
}

export function isWithinBillingRange(date: string, start: string, end: string) {
  const d = dayjs(date)
  const from = dayjs(start).startOf('day')
  const to = dayjs(end).endOf('day')
  return !d.isBefore(from) && !d.isAfter(to)
}

export function isImportedBillPayment(tx: { title?: string | null }): boolean {
  return /pagamento recebido/i.test(tx.title ?? '')
}

export function isImportedInvoiceSettlementCredit(tx: { title?: string | null }): boolean {
  const normalized = tx.title ?? ''
  if (/pagamento recebido|pagamento em/i.test(normalized)) return false
  if (/reversão do crédito|reversao do credito/i.test(normalized)) return false

  return /crédito de confiança|credito de confianca|estorno|reversão|reversao|iof de volta/i.test(
    normalized
  )
}

/** HouseApp bookkeeping entry — not an OFX "Pagamento recebido" line. */
export function isAppBookkeepingInvoicePayment(tx: { title?: string | null }): boolean {
  return isInvoicePaymentTitle(tx.title ?? '') && !isImportedBillPayment(tx)
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

function shouldIncludeIncomeInImportedInvoiceList(
  tx: TransactionLike & { source?: string | null },
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null
): boolean {
  if (isAppBookkeepingInvoicePayment(tx)) {
    if (isForeignManualInvoicePayment(tx, cycle)) return false
    // OFX/CSV/PDF already lists real payments as "Pagamento recebido".
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
  // Imported credits/refunds during the purchase window are not bill payments.
  if (duringPurchases && tx.statementId) return false

  return true
}

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
  if (
    hasImportedInvoiceTotal(statement) &&
    statement?.periodStart &&
    statement?.periodEnd
  ) {
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

type PaymentPeriodContext = {
  previousStatement?: InvoiceStatementLike | null
  closingDay?: number
  dueDay?: number
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
    hasImportedInvoiceTotal(statement) && statement?.dueDate
      ? statement.dueDate
      : cycle.dueDate

  const previousDue = resolvePreviousDueDate(cycle, context)
  const start = previousDue
    ? dayjs(previousDue).add(1, 'day').format('YYYY-MM-DD')
    : cycle.periodStart

  return { start, end }
}

export function derivePreviousBalance(invoiceTotal: number, purchases: number): number {
  const diffCents = reaisToCents(invoiceTotal) - reaisToCents(purchases)
  return centsToReais(Math.max(0, diffCents))
}

export type InvoiceAmountReconciliation = {
  purchases: number
  previousBalance: number
  invoiceCredits: number
  invoiceCharges: number
}

/** Gap between statement purchases and the imported invoice total (credits, fees, etc.). */
export function computeInvoiceAmountReconciliation(input: {
  purchases: number
  previousBalance: number
  invoiceTotal: number
}): InvoiceAmountReconciliation {
  const baseCents =
    reaisToCents(input.previousBalance) + reaisToCents(input.purchases)
  const gapCents = baseCents - reaisToCents(input.invoiceTotal)

  return {
    purchases: input.purchases,
    previousBalance: input.previousBalance,
    invoiceCredits: gapCents > 0 ? centsToReais(gapCents) : 0,
    invoiceCharges: gapCents < 0 ? centsToReais(-gapCents) : 0,
  }
}

/** Portion of purchases attributed to other people via splits. */
export function computePersonalSpendAdjustment(purchases: number, mySpend: number): number {
  const diffCents = reaisToCents(purchases) - reaisToCents(mySpend)
  return diffCents > 0 ? centsToReais(diffCents) : 0
}

export type InvoiceAdjustmentLine = {
  title: string
  amount: number
}

function isCreditReversalTitle(title: string): boolean {
  return /reversão do crédito|reversao do credito/i.test(title)
}

/** Income on the statement that reduces the imported invoice total (not bill payments). */
export function isInvoiceStatementAdjustment(
  tx: TransactionLike & { source?: string | null },
  period: { start: string; end: string },
  cycle: BillingCycle,
  statement: InvoiceStatementLike | null
): boolean {
  if (tx.type !== 'income') return false
  if (
    !isWithinBillingRange(transactionPurchaseDate(tx), period.start, period.end)
  ) {
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
      amount: moneyStringToReais(tx.amount),
    }))
    .filter(line => line.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

/** Residual credits not matched to individual transactions (rounding / summary gaps). */
export function resolveUnlistedInvoiceCredits(
  invoiceCredits: number,
  creditLines: InvoiceAdjustmentLine[]
): number {
  const listedCents = creditLines.reduce(
    (sum, line) => sum + reaisToCents(line.amount),
    0
  )
  const gapCents = reaisToCents(invoiceCredits) - listedCents
  // Hide sub-real residuals; surface meaningful bank-level adjustments.
  return gapCents >= 100 ? centsToReais(gapCents) : 0
}

export function hasStoredInvoiceSummary(statement: InvoiceStatementLike | null): boolean {
  return (
    statement?.purchasesTotal != null &&
    statement?.previousBalance != null
  )
}

export type CreditCardReportScope = {
  statementId?: string
  excludeImported?: boolean
}

/** Keeps analytics aligned with invoice metrics — no cross-invoice imported lines. */
export function buildCreditCardReportScope(
  matchedStatement: InvoiceStatementLike | null
): CreditCardReportScope {
  if (matchedStatement?.id) {
    return { statementId: matchedStatement.id }
  }

  return { excludeImported: true }
}

/** Manual entries added after an import. */
export function sumManualPurchasesInPeriod(
  transactions: TransactionLike[],
  periodStart: string,
  periodEnd: string
): number {
  return sumAmounts(
    transactions.filter(
      t =>
        t.type === 'expense' &&
        t.source === 'manual' &&
        isWithinBillingRange(transactionPurchaseDate(t), periodStart, periodEnd)
    ),
    'expense'
  )
}

/** Imported lines belong to their statement's invoice, not adjacent misaligned billing cycles. */
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

/**
 * Purchases use the imported statement period when available.
 * Payments apply from closing through due date (statement dates when imported).
 */
/** OFX LEDGERBAL is net of payments; gross imports still need payments deducted from remaining. */
export function isNetImportedInvoiceTotal(
  invoiceTotal: number,
  purchases: number,
  previousBalance: number,
  payments: number
): boolean {
  if (payments <= 0) return false

  const netCents =
    reaisToCents(purchases) + reaisToCents(previousBalance) - reaisToCents(payments)

  return reaisToCents(invoiceTotal) === netCents
}

function sumPaymentsNotInStatement(
  transactions: TransactionLike[],
  purchasesPeriod: { start: string; end: string },
  paymentPeriod: { start: string; end: string },
  statement: InvoiceStatementLike | null,
  cycle: BillingCycle
): number {
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

  const allPaymentsFromTx = centsToReais(
    reaisToCents(paymentsFromTx) + reaisToCents(crossStatementPayments)
  )

  const imported = hasImportedInvoiceTotal(statement)
  const storedSummary = hasStoredInvoiceSummary(statement)
  const invoiceTotal = imported ? Math.max(0, parseMoney(statement!.totalAmount)) : 0
  const manualPurchases =
    imported && storedSummary
      ? sumManualPurchasesInPeriod(
          ownedTransactions,
          purchasesPeriod.start,
          purchasesPeriod.end
        )
      : 0

  const purchases = imported
    ? storedSummary
      ? centsToReais(
          reaisToCents(parseMoney(statement!.purchasesTotal)) + reaisToCents(manualPurchases)
        )
      : purchasesFromTx
    : purchasesFromTx

  const previousBalance = imported
    ? storedSummary
      ? parseMoney(statement!.previousBalance)
      : derivePreviousBalance(invoiceTotal, purchases)
    : parseMoney(statement?.previousBalance)

  const resolvedInvoiceTotal = imported
    ? centsToReais(reaisToCents(invoiceTotal) + reaisToCents(manualPurchases))
    : centsToReais(Math.max(0, reaisToCents(previousBalance) + reaisToCents(purchases)))

  const payments = imported
    ? allPaymentsFromTx > 0
      ? allPaymentsFromTx
      : statement?.paymentsReceived != null
        ? parseMoney(statement.paymentsReceived)
        : allPaymentsFromTx
    : allPaymentsFromTx

  const isNetOfxTotal =
    imported &&
    statement?.importSource === 'ofx' &&
    isNetImportedInvoiceTotal(resolvedInvoiceTotal, purchases, previousBalance, payments)

  let paymentsToDeduct: number
  if (statement?.isClosed && !statement?.isPaid && payments > 0 && !isNetOfxTotal) {
    // Closed invoice with bill payments — BALAMT may predate payments from the next OFX.
    paymentsToDeduct = payments
  } else if (imported && (statement?.importSource === 'ofx' || isNetOfxTotal)) {
    // Open OFX (BALAMT already net) — only deduct manual extras.
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
      : 0

  const remaining =
    statement?.isClosed && statement?.isPaid
      ? 0
      : centsToReais(
          Math.max(
            0,
            reaisToCents(resolvedInvoiceTotal) -
              reaisToCents(paymentsToDeduct) -
              reaisToCents(settlementCredits)
          )
        )

  return {
    previousBalance,
    purchases,
    invoiceTotal: resolvedInvoiceTotal,
    payments,
    remaining,
    usesImportedStatementPeriod: purchasesPeriod.usesImportedStatementPeriod,
  }
}
