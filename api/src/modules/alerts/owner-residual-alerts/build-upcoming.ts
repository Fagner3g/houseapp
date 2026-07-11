import { isUpcomingConfig } from '../alert-rule-config'
import { buildOwnerInvoiceDedupeKey, buildOwnerTxDedupeKey } from './dedupe'
import {
  amountBody,
  amountString,
  buildInvoiceTitle,
  buildTxTitle,
  resolveOrgRule,
  shouldEmitUpcoming,
  type OwnerResidualCreateInput,
} from './helpers'
import type { OwnerInvoiceAlert, OwnerTxAlert } from './types'
import type { AlertRuleLike } from '../alert-rule-config'

export function buildOwnerResidualUpcomingInputs(params: {
  rules: AlertRuleLike[]
  invoices: OwnerInvoiceAlert[]
  transactions: OwnerTxAlert[]
  organizationName?: string
}): OwnerResidualCreateInput[] {
  const upcomingRule = resolveOrgRule(params.rules, 'upcoming')
  if (!upcomingRule || !isUpcomingConfig(upcomingRule.config)) return []

  const orgMeta =
    params.organizationName != null && params.organizationName.trim() !== ''
      ? { organizationName: params.organizationName.trim() }
      : {}

  const inputs: OwnerResidualCreateInput[] = []

  for (const invoice of params.invoices) {
    const matchingDay = shouldEmitUpcoming(invoice.daysUntilDue, upcomingRule.config)
    if (matchingDay === null) continue

    const amount = amountString(invoice.remainingCentavos)
    inputs.push({
      rule: upcomingRule,
      transactionId: null,
      accountId: invoice.accountId,
      title: buildInvoiceTitle(invoice, invoice.daysUntilDue),
      body: amountBody(invoice.remainingCentavos, invoice.dueDate),
      daysUntilDue: invoice.daysUntilDue,
      daysBefore: matchingDay,
      dedupeKeyBuilder: (userId, channel) =>
        buildOwnerInvoiceDedupeKey({
          accountId: invoice.accountId,
          monthKey: invoice.monthKey,
          slot: `day-${matchingDay}`,
          userId,
          channel,
        }),
      metadata: {
        kind: 'invoice_upcoming',
        accountId: invoice.accountId,
        accountName: invoice.accountName,
        monthKey: invoice.monthKey,
        daysUntilDue: invoice.daysUntilDue,
        amount,
        dueDate: invoice.dueDate.toISOString(),
        isCreditCardInvoice: true,
        ...orgMeta,
      },
    })
  }

  for (const alert of params.transactions) {
    const matchingDay = shouldEmitUpcoming(alert.daysUntilDue, upcomingRule.config)
    if (matchingDay === null) continue

    const amount = amountString(alert.remainingCentavos)
    inputs.push({
      rule: upcomingRule,
      transactionId: alert.transaction.id,
      accountId: alert.transaction.accountId,
      title: buildTxTitle(alert),
      body: amountBody(alert.remainingCentavos, alert.dueDate),
      daysUntilDue: alert.daysUntilDue,
      daysBefore: matchingDay,
      dedupeKeyBuilder: (userId, channel) =>
        buildOwnerTxDedupeKey({
          transactionId: alert.transaction.id,
          slot: `day-${matchingDay}`,
          userId,
          channel,
        }),
      metadata: {
        kind: 'owner_upcoming',
        daysUntilDue: alert.daysUntilDue,
        amount,
        dueDate: alert.dueDate.toISOString(),
        ...orgMeta,
      },
    })
  }

  return inputs
}
