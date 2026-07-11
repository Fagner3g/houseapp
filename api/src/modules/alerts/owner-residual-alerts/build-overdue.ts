import type { OverdueAlertConfig } from '@/db/schemas/alertRules'

import { getOverduePeriodKey } from '../alert-utils'
import type { AlertRuleLike } from '../alert-rule-config'
import { isOverdueConfig } from '../alert-rule-config'
import { buildOwnerInvoiceDedupeKey, buildOwnerTxDedupeKey } from './dedupe'
import {
  amountBody,
  amountString,
  buildInvoiceTitle,
  buildTxTitle,
  resolveOrgRule,
  type OwnerResidualCreateInput,
} from './helpers'
import type { OwnerInvoiceAlert, OwnerTxAlert } from './types'

export function buildOwnerResidualOverdueInputs(params: {
  rules: AlertRuleLike[]
  invoices: OwnerInvoiceAlert[]
  transactions: OwnerTxAlert[]
  organizationName?: string
}): OwnerResidualCreateInput[] {
  const overdueRule = resolveOrgRule(params.rules, 'overdue')
  if (!overdueRule || !isOverdueConfig(overdueRule.config)) return []

  const config = overdueRule.config as OverdueAlertConfig
  const periodKey = getOverduePeriodKey(config.frequency, config.interval)
  const orgMeta =
    params.organizationName != null && params.organizationName.trim() !== ''
      ? { organizationName: params.organizationName.trim() }
      : {}
  const inputs: OwnerResidualCreateInput[] = []

  for (const invoice of params.invoices) {
    if (invoice.daysUntilDue >= 0) continue

    const overdueDays = Math.abs(invoice.daysUntilDue)
    const amount = amountString(invoice.remainingCentavos)
    inputs.push({
      rule: overdueRule,
      transactionId: null,
      accountId: invoice.accountId,
      title: buildInvoiceTitle(invoice, invoice.daysUntilDue),
      body: amountBody(invoice.remainingCentavos, invoice.dueDate),
      daysUntilDue: invoice.daysUntilDue,
      daysBefore: 0,
      dedupeKeyBuilder: (userId, channel) =>
        buildOwnerInvoiceDedupeKey({
          accountId: invoice.accountId,
          monthKey: invoice.monthKey,
          slot: `period-${periodKey}`,
          userId,
          channel,
        }),
      metadata: {
        kind: 'invoice_overdue',
        accountId: invoice.accountId,
        accountName: invoice.accountName,
        monthKey: invoice.monthKey,
        daysUntilDue: invoice.daysUntilDue,
        overdueDays,
        amount,
        dueDate: invoice.dueDate.toISOString(),
        isCreditCardInvoice: true,
        ...orgMeta,
      },
    })
  }

  for (const alert of params.transactions) {
    if (alert.daysUntilDue >= 0) continue

    const overdueDays = Math.abs(alert.daysUntilDue)
    const amount = amountString(alert.remainingCentavos)
    inputs.push({
      rule: overdueRule,
      transactionId: alert.transaction.id,
      accountId: alert.transaction.accountId,
      title: buildTxTitle(alert),
      body: amountBody(alert.remainingCentavos, alert.dueDate),
      daysUntilDue: alert.daysUntilDue,
      daysBefore: 0,
      dedupeKeyBuilder: (userId, channel) =>
        buildOwnerTxDedupeKey({
          transactionId: alert.transaction.id,
          slot: `period-${periodKey}`,
          userId,
          channel,
        }),
      metadata: {
        kind: 'owner_overdue',
        daysUntilDue: alert.daysUntilDue,
        overdueDays,
        amount,
        dueDate: alert.dueDate.toISOString(),
        ...orgMeta,
      },
    })
  }

  return inputs
}
