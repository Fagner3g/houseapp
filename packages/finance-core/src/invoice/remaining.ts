import type { BillingCycle } from '../billing-cycle/index'
import {
  isGrossImportedInvoiceTotal,
  isLedgerBalanceImportSource,
} from './reconciliation'
import {
  sumInStatementPaymentsOnOrAfterClosing,
  sumPaymentsNotInStatement,
  sumSettlementCreditsInPeriod,
} from './remaining-sums'
import type { InvoiceStatementLike, TransactionLike } from './types'

type Period = { start: string; end: string }

/**
 * LEDGERBAL/OFX totals are the amount due as of closing. Pre-closing payments and
 * statement credits are already reflected — only deduct later/external payments.
 * Gross imports (total ≈ purchases + previous − credits) still deduct all payments.
 */
export function resolveRemainingDeductions(input: {
  imported: boolean
  statement: InvoiceStatementLike | null
  cycle: BillingCycle
  ownedTransactions: TransactionLike[]
  purchasesPeriod: Period
  paymentPeriod: Period
  resolvedInvoiceTotal: bigint
  purchases: bigint
  previousBalance: bigint
  payments: bigint
  crossStatementPayments: bigint
  isNetImportedTotal: boolean
}): { paymentsToDeduct: bigint; settlementCreditsToDeduct: bigint } {
  const settlementCredits =
    input.imported && input.statement?.isClosed
      ? sumSettlementCreditsInPeriod(input.ownedTransactions, input.purchasesPeriod)
      : 0n

  const ledgerSource = isLedgerBalanceImportSource(input.statement?.importSource)
  const importedTotalIsGross =
    input.imported &&
    isGrossImportedInvoiceTotal(
      input.resolvedInvoiceTotal,
      input.purchases,
      input.previousBalance,
      settlementCredits
    )

  const usesNetLedgerTotal = input.imported && ledgerSource && !importedTotalIsGross

  if (usesNetLedgerTotal) {
    return {
      paymentsToDeduct:
        sumPaymentsNotInStatement(
          input.ownedTransactions,
          input.purchasesPeriod,
          input.paymentPeriod,
          input.statement,
          input.cycle
        ) +
        input.crossStatementPayments +
        sumInStatementPaymentsOnOrAfterClosing(
          input.ownedTransactions,
          input.purchasesPeriod,
          input.paymentPeriod,
          input.statement,
          input.cycle
        ),
      settlementCreditsToDeduct: 0n,
    }
  }

  if (
    input.statement?.isClosed &&
    !input.statement?.isPaid &&
    input.payments > 0n &&
    !input.isNetImportedTotal
  ) {
    return {
      paymentsToDeduct: input.payments,
      settlementCreditsToDeduct: settlementCredits,
    }
  }

  if (input.imported && (ledgerSource || input.isNetImportedTotal)) {
    return {
      paymentsToDeduct: sumPaymentsNotInStatement(
        input.ownedTransactions,
        input.purchasesPeriod,
        input.paymentPeriod,
        input.statement,
        input.cycle
      ),
      settlementCreditsToDeduct: settlementCredits,
    }
  }

  return {
    paymentsToDeduct: input.payments,
    settlementCreditsToDeduct: settlementCredits,
  }
}

export {
  sumInStatementPaymentsOnOrAfterClosing,
  sumPaymentsNotInStatement,
  sumSettlementCreditsInPeriod,
} from './remaining-sums'
