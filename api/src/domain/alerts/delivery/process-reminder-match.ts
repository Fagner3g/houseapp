import { db } from '@/db'
import type { AlertDeliveryStatus } from '@/db/schemas/alertDeliveries'
import { alertDeliveries } from '@/db/schemas/alertDeliveries'
import { sendWhatsAppMessage } from '@/domain/whatsapp'
import type { ReminderMatch } from '../evaluator/evaluate-reminders'
import { buildReminderDedupeKey, formatReminderWhatsAppMessage, isAlertChannelEnabled } from '../utils'

export async function processReminderMatch(match: ReminderMatch) {
  const results = []

  for (const channel of match.channels) {
    const dedupeKey = buildReminderDedupeKey(
      match.reminder.id,
      match.reminder.dueDate,
      match.daysUntilDue,
      channel,
      match.notifyTime
    )

    const payload = {
      title: match.reminder.title,
      notes: match.reminder.notes,
      dueDate: match.reminder.dueDate.toISOString(),
      amountCents:
        match.reminder.amountCents != null ? Number(match.reminder.amountCents) : null,
      daysUntilDue: match.daysUntilDue,
      orgSlug: match.orgSlug,
      reminderId: match.reminder.id,
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
        const message = formatReminderWhatsAppMessage({
          title: match.reminder.title,
          dueDate: match.reminder.dueDate.toISOString(),
          daysUntilDue: match.daysUntilDue,
          amountCents: payload.amountCents,
          notes: match.reminder.notes,
        })
        const result = await sendWhatsAppMessage({
          phone: match.recipientPhone,
          message,
        })
        status = result.status === 'sent' ? 'sent' : 'failed'
        sentAt = result.status === 'sent' ? new Date() : null
      }
    } else if (channel === 'in_app') {
      if (!isAlertChannelEnabled('in_app', match.notificationsEnabled, match.alertPreferences)) {
        status = 'skipped'
      } else {
        status = 'sent'
        sentAt = new Date()
      }
    } else if (channel === 'extension') {
      if (!isAlertChannelEnabled('extension', match.notificationsEnabled, match.alertPreferences)) {
        status = 'skipped'
      } else {
        status = 'pending'
      }
    }

    try {
      const [delivery] = await db
        .insert(alertDeliveries)
        .values({
          organizationId: match.reminder.organizationId,
          userId: match.reminder.recipientUserId,
          sourceType: 'reminder',
          reminderId: match.reminder.id,
          kind: 'reminder_due',
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

export async function processAllReminderMatches(matches: ReminderMatch[]) {
  let processed = 0
  let errors = 0

  for (const match of matches) {
    try {
      const deliveries = await processReminderMatch(match)
      processed += deliveries.length
      errors += deliveries.filter(d => d.status === 'failed').length
    } catch {
      errors++
    }
  }

  return { processed, errors }
}
