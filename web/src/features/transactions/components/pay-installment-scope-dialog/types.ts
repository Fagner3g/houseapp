import type { SplitReimbursementChoice } from '../../lib/unified-settlement'

/** Confirmed settlement from the installment scope dialog. */
export type PayInstallmentScopeResult = {
  /** Amount applied to the current installment (and advances when selected). */
  paidAmountReais: number
  /** Future installment ids to settle with the current one; empty = current only. */
  advanceTransactionIds: string[]
  /** Creditor choices for unsettled splits (empty when none). */
  reimbursements: SplitReimbursementChoice[]
}

/** @deprecated Prefer PayInstallmentScopeResult; kept for call sites still comparing scope. */
export type PayInstallmentScope = 'current' | 'advance' | 'all'
