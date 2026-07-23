import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organizations'
import { transactions } from '@/db/schemas/transactions'
import { areSystemNotificationsEnabled } from '@/modules/system-settings/notifications-enabled'

import { resolveAlertDedupeKey, shouldSkipAlertDedupe } from '../alert-dedupe'
import type { NotificationRepository } from '../notification.repository'
import type { CreateExternalNotificationParams } from './notification-types'

export async function createExternalNotification(
  notificationRepository: NotificationRepository,
  params: CreateExternalNotificationParams
): Promise<number> {
  if (!(await areSystemNotificationsEnabled())) {
    return 0
  }

  if (!params.rule.channels.includes('whatsapp')) {
    return 0
  }

  if (
    !shouldSkipAlertDedupe() &&
    (await notificationRepository.existsByDedupeKey(params.dedupeKey))
  ) {
    return 0
  }

  const [org] = await db
    .select({ organizationId: organizations.id, ownerId: organizations.ownerId })
    .from(transactions)
    .innerJoin(organizations, eq(transactions.organizationId, organizations.id))
    .where(eq(transactions.id, params.transactionId))
    .limit(1)

  if (!org) return 0

  const notification = await notificationRepository.create({
    organizationId: org.organizationId,
    userId: org.ownerId,
    alertRuleId: params.rule.id,
    transactionId: params.transactionId,
    accountId: null,
    title: params.title,
    body: params.body,
    channel: 'whatsapp',
    status: 'pending',
    sentAt: null,
    dedupeKey: resolveAlertDedupeKey(params.dedupeKey),
    metadata: {
      ...params.metadata,
      externalPhone: params.phone,
      externalName: params.contactName,
    },
  })

  if (notification) {
    await params.onSent?.()
    return 1
  }

  return 0
}
