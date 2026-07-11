import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schemas/users'
import { sendWhatsAppMessage, normalizePhone } from '@/domain/whatsapp'
import { logger } from '@/lib/logger'

import type { NotificationRecord, NotificationRepository } from './notification.repository'
import {
  buildWhatsAppBatchGroupKey,
  buildWhatsAppBatchSendDedupeKey,
  buildWhatsAppMessageForNotification,
  buildWhatsAppMessageForNotificationBatch,
  buildWhatsAppSendDedupeKey,
} from './resolve-whatsapp-alert-context'

export type SendWhatsappNotificationsResult = {
  sent: number
  errors: number
}

type NotificationWithPhone = {
  notification: NotificationRecord
  phone: string
}

async function resolvePhone(notification: NotificationRecord): Promise<string | null> {
  const metadata = notification.metadata as Record<string, unknown>
  const externalPhone = typeof metadata.externalPhone === 'string' ? metadata.externalPhone : null

  if (externalPhone) return normalizePhone(externalPhone) || null

  const [user] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, notification.userId))
    .limit(1)

  if (!user?.phone) return null
  const normalized = normalizePhone(user.phone)
  return normalized || null
}

function groupNotifications(entries: NotificationWithPhone[]): NotificationWithPhone[][] {
  const groups = new Map<string, NotificationWithPhone[]>()

  for (const entry of entries) {
    const metadata = entry.notification.metadata as Record<string, unknown>
    const kind = typeof metadata.kind === 'string' ? metadata.kind : null
    const groupKey = buildWhatsAppBatchGroupKey(
      entry.phone,
      entry.notification.userId,
      entry.notification.organizationId,
      kind
    )

    const existing = groups.get(groupKey) ?? []
    existing.push(entry)
    groups.set(groupKey, existing)
  }

  return [...groups.values()]
}

export async function sendWhatsappForNotifications(
  notificationRepository: NotificationRepository,
  notifications: NotificationRecord[]
): Promise<SendWhatsappNotificationsResult> {
  let sent = 0
  let errors = 0
  const sentInBatch = new Set<string>()

  const entries: NotificationWithPhone[] = []

  for (const notification of notifications) {
    const phone = await resolvePhone(notification)

    if (!phone) {
      await notificationRepository.markFailed(notification.id)
      errors += 1
      continue
    }

    entries.push({ notification, phone })
  }

  const groups = groupNotifications(entries)

  for (const group of groups) {
    try {
      const metadata = group[0].notification.metadata as Record<string, unknown>
      const kind = typeof metadata.kind === 'string' ? metadata.kind : null
      const phone = group[0].phone
      const userId = group[0].notification.userId
      const organizationId = group[0].notification.organizationId
      const notificationIds = group.map(entry => entry.notification.id)

      if (group.length === 1) {
        const { notification } = group[0]
        const itemMetadata = notification.metadata as Record<string, unknown>
        const daysUntilDue =
          typeof itemMetadata.daysUntilDue === 'number' ? itemMetadata.daysUntilDue : null
        const itemKind = typeof itemMetadata.kind === 'string' ? itemMetadata.kind : null
        const splitId = typeof itemMetadata.splitId === 'string' ? itemMetadata.splitId : null
        const sendKey = buildWhatsAppSendDedupeKey(
          phone,
          notification.userId,
          notification.transactionId,
          daysUntilDue,
          itemKind,
          splitId
        )

        if (sentInBatch.has(sendKey)) {
          await notificationRepository.markSent(notification.id)
          continue
        }

        const message = await buildWhatsAppMessageForNotification(notification)
        const result = await sendWhatsAppMessage({ phone, message })

        if (result.status === 'sent') {
          await notificationRepository.markSent(notification.id)
          sentInBatch.add(sendKey)
          sent += 1
        } else {
          await notificationRepository.markFailed(notification.id)
          errors += 1
        }

        continue
      }

      const batchSendKey = buildWhatsAppBatchSendDedupeKey(
        phone,
        userId,
        organizationId,
        kind,
        notificationIds
      )

      if (sentInBatch.has(batchSendKey)) {
        await Promise.all(notificationIds.map(id => notificationRepository.markSent(id)))
        continue
      }

      const message = await buildWhatsAppMessageForNotificationBatch(
        group.map(entry => entry.notification)
      )
      const result = await sendWhatsAppMessage({ phone, message })

      if (result.status === 'sent') {
        await Promise.all(notificationIds.map(id => notificationRepository.markSent(id)))
        sentInBatch.add(batchSendKey)
        sent += 1
      } else {
        await Promise.all(notificationIds.map(id => notificationRepository.markFailed(id)))
        errors += group.length
      }
    } catch (error) {
      logger.error(
        { error, notificationIds: group.map(entry => entry.notification.id) },
        'Failed to send WhatsApp alert batch'
      )
      await Promise.all(group.map(entry => notificationRepository.markFailed(entry.notification.id)))
      errors += group.length
    }
  }

  return { sent, errors }
}
