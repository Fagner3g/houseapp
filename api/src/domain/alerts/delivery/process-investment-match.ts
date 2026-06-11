import type { AlertDeliveryStatus } from '@/db/schemas/alertDeliveries'
import { normalizePhone } from '@/domain/whatsapp'
import type { InvestmentMatch } from '../evaluator/evaluate-investment-reminders'
import {
  buildInvestmentDedupeKey,
  formatInvestmentWhatsAppMessage,
  isAlertChannelEnabled,
} from '../utils'
import type { DeferredWhatsAppDelivery } from './batch-whatsapp-alerts'
import { insertAlertDelivery } from './insert-alert-delivery'

export async function processInvestmentMatch(
  match: InvestmentMatch,
  whatsappQueue: DeferredWhatsAppDelivery[] = []
) {
  const results = []
  const kind =
    match.item.status === 'overdue' ? 'investment_overdue' : 'investment_due'

  for (const channel of match.channels) {
    const dedupeKey = buildInvestmentDedupeKey(
      match.item.planId,
      match.item.referenceMonth,
      match.userId,
      channel,
      match.notifyTime
    )

    const payload = {
      assetId: match.item.assetId,
      planId: match.item.planId,
      referenceMonth: match.item.referenceMonth,
      assetSymbol: match.item.assetSymbol,
      assetName: match.item.assetName,
      dueDate: match.item.dueDate,
      plannedAmount: match.item.plannedAmount,
      plannedQuantity: match.item.plannedQuantity,
      status: match.item.status,
      orgSlug: match.orgSlug,
      title: `${match.item.assetSymbol} — aporte ${match.item.referenceMonth}`,
    }

    let status: AlertDeliveryStatus = 'pending'
    let sentAt: Date | null = null

    if (channel === 'whatsapp') {
      if (
        !isAlertChannelEnabled('whatsapp', match.notificationsEnabled, match.alertPreferences) ||
        !normalizePhone(match.recipientPhone)
      ) {
        status = 'skipped'
      } else {
        whatsappQueue.push({
          phone: normalizePhone(match.recipientPhone),
          organizationId: match.organizationId,
          orgName: match.orgName,
          isOrgOwner: match.userId === match.orgOwnerId,
          recipientName: match.recipientName,
          body: formatInvestmentWhatsAppMessage({
            assetSymbol: match.item.assetSymbol,
            plannedAmount: match.item.plannedAmount,
            plannedQuantity: match.item.plannedQuantity,
            referenceMonth: match.item.referenceMonth,
            status: match.item.status,
          }),
          delivery: {
            organizationId: match.organizationId,
            userId: match.userId,
            sourceType: 'investment',
            kind,
            channel,
            payload,
            dedupeKey,
          },
        })
        continue
      }
    } else if (channel === 'in_app') {
      if (
        !isAlertChannelEnabled('in_app', match.notificationsEnabled, match.alertPreferences)
      ) {
        status = 'skipped'
      } else {
        status = 'sent'
        sentAt = new Date()
      }
    } else if (channel === 'extension') {
      if (
        !isAlertChannelEnabled('extension', match.notificationsEnabled, match.alertPreferences)
      ) {
        status = 'skipped'
      } else {
        status = 'pending'
      }
    }

    const delivery = await insertAlertDelivery({
      organizationId: match.organizationId,
      userId: match.userId,
      sourceType: 'investment',
      kind,
      channel,
      status,
      payload,
      sentAt,
      dedupeKey,
    })

    if (delivery) {
      results.push(delivery)
    }
  }

  return results
}

export async function processAllInvestmentMatches(
  matches: InvestmentMatch[],
  whatsappQueue: DeferredWhatsAppDelivery[] = []
) {
  let processed = 0
  let errors = 0

  for (const match of matches) {
    try {
      const deliveries = await processInvestmentMatch(match, whatsappQueue)
      processed += deliveries.length
      errors += deliveries.filter(d => d.status === 'failed').length
    } catch {
      errors++
    }
  }

  return { processed, errors }
}
