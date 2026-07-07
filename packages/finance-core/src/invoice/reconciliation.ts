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
