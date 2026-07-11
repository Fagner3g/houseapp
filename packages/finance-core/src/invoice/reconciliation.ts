import { maxCentavos, parseMoneyStringToCentavos } from '../money/strings'

export function derivePreviousBalance(invoiceTotal: bigint, purchases: bigint): bigint {
  const diff = invoiceTotal - purchases
  return maxCentavos(diff, 0n)
}

export function computeInvoiceAmountReconciliation(input: {
  purchases: bigint
  previousBalance: bigint
  invoiceTotal: bigint
}) {
  const base = input.previousBalance + input.purchases
  const gap = base - input.invoiceTotal

  return {
    purchases: input.purchases,
    previousBalance: input.previousBalance,
    invoiceCredits: gap > 0n ? gap : 0n,
    invoiceCharges: gap < 0n ? -gap : 0n,
  }
}

export function computePersonalSpendAdjustment(purchases: bigint, mySpend: bigint): bigint {
  const diff = purchases - mySpend
  return diff > 0n ? diff : 0n
}

export function isLedgerBalanceImportSource(source: string | null | undefined): boolean {
  return source === 'ofx' || source === 'xlsx'
}

/** OFX LEDGERBAL is net of payments; gross imports still need payments deducted from remaining. */
export function isNetImportedInvoiceTotal(
  invoiceTotal: bigint,
  purchases: bigint,
  previousBalance: bigint,
  payments: bigint
): boolean {
  if (payments <= 0n) return false

  const net = purchases + previousBalance - payments
  return invoiceTotal === net
}

/**
 * True when imported total matches purchases + previous − settlement credits (within 1 cent).
 * Those statements still need bill payments deducted from remaining.
 */
export function isGrossImportedInvoiceTotal(
  invoiceTotal: bigint,
  purchases: bigint,
  previousBalance: bigint,
  settlementCredits: bigint
): boolean {
  const gross = purchases + previousBalance - settlementCredits
  const gap = gross > invoiceTotal ? gross - invoiceTotal : invoiceTotal - gross
  return gap <= 1n
}

export function parseStatementMoney(value: string | null | undefined): bigint {
  return maxCentavos(parseMoneyStringToCentavos(value), 0n)
}

export function reconcileInvoiceTotalWithManualPurchases(
  invoiceTotal: bigint,
  manualPurchases: bigint
): bigint {
  return invoiceTotal + manualPurchases
}

export function resolveComputedInvoiceTotal(
  imported: boolean,
  invoiceTotal: bigint,
  manualPurchases: bigint,
  previousBalance: bigint,
  purchases: bigint
): bigint {
  if (imported) {
    return reconcileInvoiceTotalWithManualPurchases(invoiceTotal, manualPurchases)
  }

  return maxCentavos(previousBalance + purchases, 0n)
}
