import { and, desc, eq, inArray, sql } from 'drizzle-orm'

import { db } from '@/db'
import {
  notifications,
  type NotificationChannel,
  type NotificationStatus,
} from '@/db/schemas/notifications'

/** Kinds that require an explicit user decision and must not be bulk-dismissed. */
export const DECISION_NOTIFICATION_KINDS = ['split_payment_request'] as const

export type NotificationRecord = typeof notifications.$inferSelect

export type CreateNotificationData = {
  organizationId: string
  userId: string
  alertRuleId?: string | null
  transactionId?: string | null
  accountId?: string | null
  title: string
  body?: string | null
  channel: NotificationChannel
  status?: NotificationStatus
  sentAt?: Date | null
  dedupeKey: string
  metadata?: Record<string, unknown>
}

export interface NotificationRepository {
  findByUser(userId: string, limit?: number): Promise<NotificationRecord[]>
  findPendingByUser(userId: string, limit?: number): Promise<NotificationRecord[]>
  findById(id: string): Promise<NotificationRecord | null>
  existsByDedupeKey(dedupeKey: string): Promise<boolean>
  create(data: CreateNotificationData): Promise<NotificationRecord | null>
  markRead(id: string, userId: string): Promise<NotificationRecord | null>
  markInformationalRead(userId: string): Promise<number>
  findPendingByChannel(channel: NotificationChannel, limit?: number): Promise<NotificationRecord[]>
  findPendingByChannelAndUser(
    channel: NotificationChannel,
    userId: string,
    organizationId?: string,
    limit?: number
  ): Promise<NotificationRecord[]>
  markSent(id: string): Promise<NotificationRecord | null>
  markFailed(id: string): Promise<NotificationRecord | null>
}

export class DrizzleNotificationRepository implements NotificationRepository {
  async findByUser(userId: string, limit = 50): Promise<NotificationRecord[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
  }

  async findPendingByUser(userId: string, limit = 50): Promise<NotificationRecord[]> {
    return db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          inArray(notifications.status, ['pending', 'sent'])
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
  }

  async findById(id: string): Promise<NotificationRecord | null> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1)

    return notification ?? null
  }

  async existsByDedupeKey(dedupeKey: string): Promise<boolean> {
    const [row] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(eq(notifications.dedupeKey, dedupeKey))
      .limit(1)

    return Boolean(row)
  }

  async create(data: CreateNotificationData): Promise<NotificationRecord | null> {
    try {
      const [created] = await db
        .insert(notifications)
        .values({
          organizationId: data.organizationId,
          userId: data.userId,
          alertRuleId: data.alertRuleId ?? null,
          transactionId: data.transactionId ?? null,
          accountId: data.accountId ?? null,
          title: data.title,
          body: data.body ?? null,
          channel: data.channel,
          status: data.status ?? 'sent',
          sentAt: data.sentAt === undefined ? new Date() : data.sentAt,
          dedupeKey: data.dedupeKey,
          metadata: data.metadata ?? {},
        })
        .returning()

      return created
    } catch {
      return null
    }
  }

  async markRead(id: string, userId: string): Promise<NotificationRecord | null> {
    const [updated] = await db
      .update(notifications)
      .set({
        status: 'read',
        readAt: new Date(),
      })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning()

    return updated ?? null
  }

  async markInformationalRead(userId: string): Promise<number> {
    const updated = await db
      .update(notifications)
      .set({
        status: 'read',
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.userId, userId),
          inArray(notifications.channel, ['in_app', 'extension']),
          inArray(notifications.status, ['pending', 'sent']),
          sql`coalesce(${notifications.metadata}->>'kind', '') <> ${DECISION_NOTIFICATION_KINDS[0]}`
        )
      )
      .returning({ id: notifications.id })

    return updated.length
  }

  async findPendingByChannel(
    channel: NotificationChannel,
    limit = 100
  ): Promise<NotificationRecord[]> {
    return db
      .select()
      .from(notifications)
      .where(and(eq(notifications.channel, channel), eq(notifications.status, 'pending')))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
  }

  async findPendingByChannelAndUser(
    channel: NotificationChannel,
    userId: string,
    organizationId?: string,
    limit = 100
  ): Promise<NotificationRecord[]> {
    const conditions = [
      eq(notifications.channel, channel),
      eq(notifications.status, 'pending'),
      eq(notifications.userId, userId),
    ]

    if (organizationId) {
      conditions.push(eq(notifications.organizationId, organizationId))
    }

    return db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
  }

  async markSent(id: string): Promise<NotificationRecord | null> {
    const [updated] = await db
      .update(notifications)
      .set({
        status: 'sent',
        sentAt: new Date(),
      })
      .where(eq(notifications.id, id))
      .returning()

    return updated ?? null
  }

  async markFailed(id: string): Promise<NotificationRecord | null> {
    const [updated] = await db
      .update(notifications)
      .set({
        status: 'failed',
      })
      .where(eq(notifications.id, id))
      .returning()

    return updated ?? null
  }
}
