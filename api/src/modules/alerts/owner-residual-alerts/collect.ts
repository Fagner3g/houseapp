import { isResidualCandidate, isCreditCardResidual } from './classify'
import { isDueOnOrBeforeCurrentMonth } from './due-window'
import { collectInvoiceGroupSeeds, listResidualNonCcAlerts } from './group-invoices'
import { resolveOwnerInvoiceAlerts } from './invoice-remaining'
import type { ResidualMetricTransaction, ResidualStatement } from './metric-map'
import type { OwnerResidualCollection, ResidualTransaction } from './types'

function ledgerFromResidualCandidates(
  transactions: ResidualTransaction[]
): Record<string, ResidualMetricTransaction[]> {
  const byAccount: Record<string, ResidualMetricTransaction[]> = {}

  for (const tx of transactions) {
    if (!isCreditCardResidual(tx) || !tx.accountId) continue
    const list = byAccount[tx.accountId] ?? []
    list.push({
      id: tx.id,
      accountId: tx.accountId,
      title: tx.title,
      amount: tx.amount,
      type: tx.type,
      date: tx.date,
      competenceDate: tx.competenceDate,
      statementId: null,
      source: null,
    })
    byAccount[tx.accountId] = list
  }

  return byAccount
}

export type CollectOwnerResidualOptions = {
  referenceDate?: Date
  creditCardLedgerByAccountId?: Record<string, ResidualMetricTransaction[]>
  statementsByAccountId?: Record<string, ResidualStatement[]>
}

export function collectOwnerResidualAlerts(
  transactions: ResidualTransaction[],
  delegatedTransactionIds: Set<string>,
  options: CollectOwnerResidualOptions | Date = {}
): OwnerResidualCollection {
  const normalized: CollectOwnerResidualOptions =
    options instanceof Date ? { referenceDate: options } : options
  const referenceDate = normalized.referenceDate ?? new Date()

  const residual = transactions.filter(tx => isResidualCandidate(tx, delegatedTransactionIds))
  const seeds = collectInvoiceGroupSeeds(residual)
  const ledger = normalized.creditCardLedgerByAccountId ?? ledgerFromResidualCandidates(residual)

  const invoices = resolveOwnerInvoiceAlerts({
    seeds,
    transactionsByAccountId: ledger,
    statementsByAccountId: normalized.statementsByAccountId ?? {},
    referenceDate,
  }).filter(invoice => isDueOnOrBeforeCurrentMonth(invoice.dueDate, referenceDate))

  const nonCcAlerts = listResidualNonCcAlerts(residual, referenceDate).filter(alert =>
    isDueOnOrBeforeCurrentMonth(alert.dueDate, referenceDate)
  )

  return { invoices, transactions: nonCcAlerts }
}
