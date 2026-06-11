import { db } from '@/db'
import type { AlertDeliveryStatus } from '@/db/schemas/alertDeliveries'
import { alertDeliveries } from '@/db/schemas/alertDeliveries'
import { sendWhatsAppMessage } from '@/domain/whatsapp'
import type { TransactionRuleMatch } from '../evaluator/evaluate-transaction-rules'
import {
  buildOverdueRuleDedupeKey,
  buildTransactionAlertExtraInfo,
  buildUpcomingRuleDedupeKey,
  formatTransactionWhatsAppMessage,
  getOverduePeriodKey,
  getTransactionDisplayAmountCents,
  isAlertChannelEnabled,
} from '../utils'

export async function processRuleMatch(match: TransactionRuleMatch) {
  const recipient = match.recipient
  const results = []
  const { occurrence } = match
  const displayAmount = getTransactionDisplayAmountCents({
    status: occurrence.status,
    amountCents: occurrence.amountCents,
    valuePaidCents: occurrence.valuePaidCents,
  })
  const installmentInfo = buildTransactionAlertExtraInfo({
    installmentIndex: occurrence.installmentIndex,
    installmentsTotal: occurrence.installmentsTotal,
    status: occurrence.status,
    valuePaidCents: occurrence.valuePaidCents,
    amountCents: occurrence.amountCents,
  })

  for (const channel of match.channels) {
    const dedupeKey =
      match.kind === 'upcoming'
        ? buildUpcomingRuleDedupeKey(
            match.rule.id,
            match.occurrence.id,
            match.daysBefore ?? match.daysUntilDue ?? 0,
            recipient.userId,
            channel,
            match.notifyTime
          )
        : buildOverdueRuleDedupeKey(
            match.rule.id,
            match.occurrence.id,
            getOverduePeriodKey(
              (match.rule.config as { frequency: 'daily' | 'weekly' | 'monthly'; interval: number })
                .frequency,
              (match.rule.config as { frequency: 'daily' | 'weekly' | 'monthly'; interval: number })
                .interval
            ),
            recipient.userId,
            channel,
            match.notifyTime
          )

    const payload = {
      title: match.occurrence.title,
      dueDate: match.occurrence.dueDate.toISOString(),
      amountCents: displayAmount,
      daysUntilDue: match.daysUntilDue,
      overdueDays: match.overdueDays,
      orgSlug: match.orgSlug,
      occurrenceId: match.occurrence.id,
      seriesId: match.occurrence.seriesId,
      ruleId: match.rule.id,
      kind: match.kind,
      installmentInfo,
    }

    let status: AlertDeliveryStatus = 'pending'
    let sentAt: Date | null = null

    if (channel === 'whatsapp') {
      if (
        !isAlertChannelEnabled(
          'whatsapp',
          recipient.notificationsEnabled,
          recipient.alertPreferences
        ) ||
        !recipient.phone
      ) {
        status = 'skipped'
      } else {
        const message = formatTransactionWhatsAppMessage({
          title: match.occurrence.title,
          dueDate: match.occurrence.dueDate.toISOString(),
          amountCents: displayAmount,
          daysUntilDue: match.daysUntilDue,
          overdueDays: match.overdueDays,
          installmentInfo,
          kind: match.kind,
        })
        const result = await sendWhatsAppMessage({
          phone: recipient.phone,
          message,
        })
        status = result.status === 'sent' ? 'sent' : 'failed'
        sentAt = result.status === 'sent' ? new Date() : null
      }
    } else if (channel === 'in_app') {
      if (
        !isAlertChannelEnabled('in_app', recipient.notificationsEnabled, recipient.alertPreferences)
      ) {
        status = 'skipped'
      } else {
        status = 'sent'
        sentAt = new Date()
      }
    } else if (channel === 'extension') {
      if (
        !isAlertChannelEnabled(
          'extension',
          recipient.notificationsEnabled,
          recipient.alertPreferences
        )
      ) {
        status = 'skipped'
      } else {
        status = 'pending'
      }
    }

    const kind = match.kind === 'upcoming' ? 'transaction_upcoming' : 'transaction_overdue'

    try {
      const [delivery] = await db
        .insert(alertDeliveries)
        .values({
          organizationId: match.orgId,
          userId: recipient.userId,
          sourceType: 'rule',
          ruleId: match.rule.id,
          occurrenceId: match.occurrence.id,
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

export async function processAllRuleMatches(matches: TransactionRuleMatch[]) {
  let processed = 0
  let errors = 0

  for (const match of matches) {
    try {
      const deliveries = await processRuleMatch(match)
      processed += deliveries.length
      errors += deliveries.filter(d => d.status === 'failed').length
    } catch {
      errors++
    }
  }

  return { processed, errors }
}
