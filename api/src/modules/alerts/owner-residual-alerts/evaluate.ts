import type { AlertRuleLike } from '../alert-rule-config'
import { buildOwnerResidualOverdueInputs } from './build-overdue'
import { buildOwnerResidualUpcomingInputs } from './build-upcoming'
import type { OwnerResidualCreateInput } from './helpers'
import type { OwnerInvoiceAlert, OwnerTxAlert } from './types'

type EvaluateMode = 'all' | 'upcoming' | 'overdue'

export type { OwnerResidualCreateInput }

export function buildOwnerResidualCreateInputs(params: {
  mode: EvaluateMode
  rules: AlertRuleLike[]
  invoices: OwnerInvoiceAlert[]
  transactions: OwnerTxAlert[]
  organizationName?: string
}): OwnerResidualCreateInput[] {
  const inputs: OwnerResidualCreateInput[] = []
  const organizationName = params.organizationName

  if (params.mode !== 'overdue') {
    inputs.push(
      ...buildOwnerResidualUpcomingInputs({
        rules: params.rules,
        invoices: params.invoices,
        transactions: params.transactions,
        organizationName,
      })
    )
  }

  if (params.mode !== 'upcoming') {
    inputs.push(
      ...buildOwnerResidualOverdueInputs({
        rules: params.rules,
        invoices: params.invoices,
        transactions: params.transactions,
        organizationName,
      })
    )
  }

  return inputs
}
