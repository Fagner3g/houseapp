import type { AlertDeliveryStatus } from '@/db/schemas/alertDeliveries'
import { normalizePhone } from '@/domain/whatsapp'
import type { ReminderMatch } from '../evaluator/evaluate-reminders'
import {
  buildReminderOverdueDayDedupeKey,
  buildReminderUpcomingDedupeKey,
  formatReminderWhatsAppMessage,
  isAlertChannelEnabled,
} from '../utils'
import type { DeferredWhatsAppDelivery } from './batch-whatsapp-alerts'
import { insertAlertDelivery } from './insert-alert-delivery'

export async function processReminderMatch(
  match: ReminderMatch,
  whatsappQueue: DeferredWhatsAppDelivery[] = []
) {
  const results = []
  const deliveryKind = match.kind === 'upcoming' ? 'reminder_upcoming' : 'reminder_overdue'

  for (const channel of match.channels) {
    const dedupeKey =
      match.kind === 'upcoming'
        ? buildReminderUpcomingDedupeKey(
            match.reminder.id,
            match.daysBefore ?? match.daysUntilDue,
            match.reminder.recipientUserId,
            channel,
            match.notifyTime
          )
        : buildReminderOverdueDayDedupeKey(
            match.reminder.id,
            match.daysAfter ?? match.overdueDays ?? 0,
            match.reminder.recipientUserId,
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
      overdueDays: match.overdueDays,
      kind: match.kind,
      orgSlug: match.orgSlug,
      reminderId: match.reminder.id,
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
          organizationId: match.reminder.organizationId,
          orgName: match.orgName,
          isOrgOwner: match.reminder.recipientUserId === match.orgOwnerId,
          recipientName: match.recipientName,
          body: formatReminderWhatsAppMessage({
            title: match.reminder.title,
            dueDate: match.reminder.dueDate.toISOString(),
            daysUntilDue: match.daysUntilDue,
            overdueDays: match.overdueDays,
            amountCents: payload.amountCents,
            notes: match.reminder.notes,
            kind: match.kind,
          }),
          delivery: {
            organizationId: match.reminder.organizationId,
            userId: match.reminder.recipientUserId,
            sourceType: 'reminder',
            reminderId: match.reminder.id,
            kind: deliveryKind,
            channel,
            payload,
            dedupeKey,
          },
        })
        continue
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

    const delivery = await insertAlertDelivery({
      organizationId: match.reminder.organizationId,
      userId: match.reminder.recipientUserId,
      sourceType: 'reminder',
      reminderId: match.reminder.id,
      kind: deliveryKind,
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

export async function processAllReminderMatches(
  matches: ReminderMatch[],
  whatsappQueue: DeferredWhatsAppDelivery[] = []
) {
  let processed = 0
  let errors = 0

  for (const match of matches) {
    try {
      const deliveries = await processReminderMatch(match, whatsappQueue)
      processed += deliveries.length
      errors += deliveries.filter(d => d.status === 'failed').length
    } catch {
      errors++
    }
  }

  return { processed, errors }
}
