import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  DEFAULT_ALERT_PREFERENCES,
  organizationMembers,
} from '@/db/schemas/organizationMembers'
import { isAlertChannelEnabled } from '@/modules/alerts/alert-preferences'
import type { NotificationRepository } from '@/modules/alerts/notification.repository'
import { areSystemNotificationsEnabled } from '@/modules/system-settings/notifications-enabled'

const CHANNELS = ['in_app', 'whatsapp'] as const

export type NotifyChannelsParams = {
  notificationRepository: NotificationRepository
  organizationId: string
  userId: string
  transactionId: string
  title: string
  body: string
  whatsappBody: string
  dedupeKeyPrefix: string
  metadata: Record<string, unknown>
}

export async function createChannelNotifications(params: NotifyChannelsParams): Promise<void> {
  if (!(await areSystemNotificationsEnabled())) {
    return
  }

  const [membership] = await db
    .select({
      notificationsEnabled: organizationMembers.notificationsEnabled,
      alertPreferences: organizationMembers.alertPreferences,
    })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, params.userId),
        eq(organizationMembers.organizationId, params.organizationId)
      )
    )
    .limit(1)

  const notificationsEnabled = membership?.notificationsEnabled ?? true
  const alertPreferences = membership?.alertPreferences ?? DEFAULT_ALERT_PREFERENCES

  for (const channel of CHANNELS) {
    if (!isAlertChannelEnabled(channel, notificationsEnabled, alertPreferences)) {
      continue
    }

    await params.notificationRepository.create({
      organizationId: params.organizationId,
      userId: params.userId,
      transactionId: params.transactionId,
      title: params.title,
      body: channel === 'whatsapp' ? params.whatsappBody : params.body,
      channel,
      status: channel === 'in_app' ? 'sent' : 'pending',
      sentAt: channel === 'in_app' ? new Date() : null,
      dedupeKey: `${params.dedupeKeyPrefix}:${channel}`,
      metadata: params.metadata,
    })
  }
}
