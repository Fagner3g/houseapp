import type { AlertRuleChannel, UpcomingAlertConfig } from '@/db/schemas/alertRules'
import { centavosToString } from '@/core/money'

import { buildOverdueTitle, buildUpcomingTitle } from '../alert-utils'
import type { AlertRuleLike } from '../alert-rule-config'
import type { OwnerInvoiceAlert, OwnerTxAlert } from './types'

export type OwnerResidualCreateInput = {
  transactionId: string | null
  accountId: string | null
  title: string
  body: string
  daysUntilDue: number
  daysBefore: number
  dedupeKeyBuilder: (userId: string, channel: AlertRuleChannel) => string
  metadata: Record<string, unknown>
  rule: AlertRuleLike
}

export function resolveOrgRule(
  rules: AlertRuleLike[],
  triggerType: 'upcoming' | 'overdue'
): AlertRuleLike | null {
  return (
    rules.find(
      rule => rule.isActive && rule.scope === 'organization' && rule.triggerType === triggerType
    ) ?? null
  )
}

export function shouldEmitUpcoming(
  daysUntilDue: number,
  config: UpcomingAlertConfig
): number | null {
  if (daysUntilDue < 0) return null
  const match = config.daysBefore.find(day => day === daysUntilDue)
  return match === undefined ? null : match
}

export function buildInvoiceTitle(alert: OwnerInvoiceAlert, daysUntilDue: number): string {
  const label = `Fatura ${alert.accountName}`
  if (daysUntilDue < 0) return buildOverdueTitle(label, Math.abs(daysUntilDue))
  return buildUpcomingTitle(label, daysUntilDue)
}

export function buildTxTitle(alert: OwnerTxAlert): string {
  if (alert.daysUntilDue < 0) {
    return buildOverdueTitle(alert.transaction.title, Math.abs(alert.daysUntilDue))
  }
  return buildUpcomingTitle(alert.transaction.title, alert.daysUntilDue)
}

export function amountBody(remainingCentavos: bigint, dueDate: Date): string {
  const amount = remainingCentavos > 0n ? centavosToString(remainingCentavos) : null
  const due = dueDate.toISOString()
  return amount ? `Valor: R$ ${amount} · Vencimento: ${due}` : `Vencimento: ${due}`
}

export function amountString(remainingCentavos: bigint): string | null {
  if (remainingCentavos <= 0n) return null
  return centavosToString(remainingCentavos)
}
