type SharedAccessStatementTotals = {
  totalAmount: string | null
  minimumPayment: string | null
  previousBalance: string | null
  paymentsReceived: string | null
  purchasesTotal: string | null
  otherCharges: string | null
  nextInvoiceBalance: string | null
  totalOpenBalance: string | null
  isPaid: boolean
}

/**
 * Members with temporary split access must not see the owner's imported
 * invoice totals — keep period bounds for cycle matching only.
 */
export function stripSharedAccessInvoiceTotals<T extends SharedAccessStatementTotals>(
  statement: T
): T {
  return {
    ...statement,
    totalAmount: null,
    minimumPayment: null,
    previousBalance: null,
    paymentsReceived: null,
    purchasesTotal: null,
    otherCharges: null,
    nextInvoiceBalance: null,
    totalOpenBalance: null,
    isPaid: false,
  }
}
