import { notFound } from '@/core/errors'

import type { NotificationRecord, NotificationRepository } from './notification.repository'

export type NotificationDto = {
  id: string
  organizationId: string
  userId: string
  alertRuleId: string | null
  transactionId: string | null
  accountId: string | null
  title: string
  body: string | null
  channel: string
  status: string
  sentAt: string | null
  readAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

function toNotificationDto(notification: NotificationRecord): NotificationDto {
  return {
    id: notification.id,
    organizationId: notification.organizationId,
    userId: notification.userId,
    alertRuleId: notification.alertRuleId,
    transactionId: notification.transactionId,
    accountId: notification.accountId,
    title: notification.title,
    body: notification.body,
    channel: notification.channel,
    status: notification.status,
    sentAt: notification.sentAt?.toISOString() ?? null,
    readAt: notification.readAt?.toISOString() ?? null,
    metadata: notification.metadata,
    createdAt: notification.createdAt.toISOString(),
  }
}

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async list(userId: string): Promise<NotificationDto[]> {
    const rows = await this.notificationRepository.findByUser(userId)
    return rows.map(toNotificationDto)
  }

  async listPending(userId: string): Promise<NotificationDto[]> {
    const rows = await this.notificationRepository.findPendingByUser(userId)
    return rows.map(toNotificationDto)
  }

  async markRead(userId: string, id: string): Promise<NotificationDto> {
    const existing = await this.notificationRepository.findById(id)

    if (!existing || existing.userId !== userId) {
      throw notFound('Notification not found')
    }

    const updated = await this.notificationRepository.markRead(id, userId)

    if (!updated) {
      throw notFound('Notification not found')
    }

    return toNotificationDto(updated)
  }
}
