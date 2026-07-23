import { notFound } from '@/core/errors'
import {
  dismissDecisionNotificationsForRequests,
  findPendingPaymentRequestIds,
} from '@/modules/splits/payment-request/dismiss-decision-notifications'

import {
  collectDecisionRequestIds,
  keepActiveDecisionNotifications,
} from './filter-stale-decision-notifications'
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
    const active = await this.dropStaleDecisionNotifications(rows)
    return active.map(toNotificationDto)
  }

  /** Hides (and dismisses) decision notifications whose payment request is no longer pending. */
  private async dropStaleDecisionNotifications(
    rows: NotificationRecord[]
  ): Promise<NotificationRecord[]> {
    const requestIds = collectDecisionRequestIds(rows)
    if (requestIds.length === 0) return rows

    const pendingIds = await findPendingPaymentRequestIds(requestIds)
    const { active, staleRequestIds } = keepActiveDecisionNotifications(rows, pendingIds)
    if (staleRequestIds.length > 0) {
      await dismissDecisionNotificationsForRequests(staleRequestIds)
    }
    return active
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

  async markInformationalRead(userId: string): Promise<{ markedCount: number }> {
    const markedCount = await this.notificationRepository.markInformationalRead(userId)
    return { markedCount }
  }
}
