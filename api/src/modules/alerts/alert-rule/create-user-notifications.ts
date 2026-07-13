import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  DEFAULT_ALERT_PREFERENCES,
  organizationMembers,
} from '@/db/schemas/organizationMembers'

import { resolveAlertDedupeKey, shouldSkipAlertDedupe } from '../alert-dedupe'
import { isAlertChannelEnabled } from '../alert-preferences'
import type { NotificationRepository } from '../notification.repository'
import type { CreateUserNotificationParams } from './notification-types'

export async function createNotificationsForUser(
  notificationRepository: NotificationRepository,
  params: CreateUserNotificationParams
): Promise<number> {
  const organizationId = params.organizationId || params.rule.organizationId

  const [membership] = await db
    .select({
      notificationsEnabled: organizationMembers.notificationsEnabled,
      alertPreferences: organizationMembers.alertPreferences,
    })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, params.userId),
        eq(organizationMembers.organizationId, organizationId)
      )
    )
    .limit(1)

  const notificationsEnabled = membership?.notificationsEnabled ?? true
  const alertPreferences = membership?.alertPreferences ?? DEFAULT_ALERT_PREFERENCES

  let created = 0

  for (const channel of params.rule.channels) {
    if (!isAlertChannelEnabled(channel, notificationsEnabled, alertPreferences)) {
      continue
    }

    const baseDedupeKey = params.dedupeKeyBuilder(params.userId, channel)

    if (
      !shouldSkipAlertDedupe(params.skipDedupe) &&
      (await notificationRepository.existsByDedupeKey(baseDedupeKey))
    ) {
      continue
    }

    const notification = await notificationRepository.create({
      organizationId,
      userId: params.userId,
      alertRuleId: params.rule.id,
      transactionId: params.transactionId,
      accountId: params.accountId,
      title: params.title,
      body: params.body,
      channel,
      status: channel === 'in_app' || channel === 'extension' ? 'sent' : 'pending',
      sentAt: channel === 'in_app' || channel === 'extension' ? new Date() : null,
      dedupeKey: resolveAlertDedupeKey(baseDedupeKey, params.skipDedupe),
      metadata: params.metadata,
    })

    if (notification) {
      created += 1
    }
  }

  return created
}
