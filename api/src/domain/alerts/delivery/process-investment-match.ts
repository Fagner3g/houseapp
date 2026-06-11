import { db } from '@/db'
import type { AlertDeliveryStatus } from '@/db/schemas/alertDeliveries'
import { alertDeliveries } from '@/db/schemas/alertDeliveries'
import { sendWhatsAppMessage } from '@/domain/whatsapp'
import type { InvestmentMatch } from '../evaluator/evaluate-investment-reminders'
import {
  buildInvestmentDedupeKey,
  formatInvestmentWhatsAppMessage,
  isAlertChannelEnabled,
} from '../utils'

export async function processInvestmentMatch(match: InvestmentMatch) {
  const results = []
  const kind =
    match.item.status === 'overdue' ? 'investment_overdue' : 'investment_due'

  for (const channel of match.channels) {
    const dedupeKey = buildInvestmentDedupeKey(
      match.item.planId,
      match.item.referenceMonth,
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
        !match.recipientPhone
      ) {
        status = 'skipped'
      } else {
        const message = formatInvestmentWhatsAppMessage({
          assetSymbol: match.item.assetSymbol,
          plannedAmount: match.item.plannedAmount,
          plannedQuantity: match.item.plannedQuantity,
          referenceMonth: match.item.referenceMonth,
        })
        const result = await sendWhatsAppMessage({
          phone: match.recipientPhone,
          message,
        })
        status = result.status === 'sent' ? 'sent' : 'failed'
        sentAt = result.status === 'sent' ? new Date() : null
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

    try {
      const [delivery] = await db
        .insert(alertDeliveries)
        .values({
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
        .returning()

      results.push(delivery)
    } catch (err) {
      const cause = (err as { cause?: { code?: string } }).cause
      if (cause?.code === '23505') continue
      throw err
    }
  }

  return results
}

export async function processAllInvestmentMatches(matches: InvestmentMatch[]) {
  let processed = 0
  let errors = 0

  for (const match of matches) {
    try {
      const deliveries = await processInvestmentMatch(match)
      processed += deliveries.length
      errors += deliveries.filter(d => d.status === 'failed').length
    } catch {
      errors++
    }
  }

  return { processed, errors }
}
