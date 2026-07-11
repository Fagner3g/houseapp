import { eq } from 'drizzle-orm'

import { db } from '@/db'
import type { AlertRuleChannel } from '@/db/schemas/alertRules'
import { organizationMembers } from '@/db/schemas/organizationMembers'
import { organizations } from '@/db/schemas/organizations'
import { transactions } from '@/db/schemas/transactions'

import type { AlertRuleRecord } from '../alert-rule.repository'
import type { NotificationRepository } from '../notification.repository'

export type CreateUserNotificationParams = {
  rule: AlertRuleRecord
  userId: string
  transactionId: string | null
  accountId: string | null
  organizationId: string
  title: string
  body: string
  daysUntilDue: number
  daysBefore: number
  dedupeKeyBuilder: (userId: string, channel: AlertRuleChannel) => string
  metadata: Record<string, unknown>
  skipDedupe?: boolean
}

export type CreateExternalNotificationParams = {
  rule: AlertRuleRecord
  transactionId: string
  phone: string
  contactName: string | null
  title: string
  body: string
  dedupeKey: string
  metadata: Record<string, unknown>
  onSent?: () => Promise<void>
}

export async function listOrganizationMemberIds(organizationId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId))

  return rows.map(row => row.userId)
}

export async function createNotificationsForOrgMembers(params: {
  organizationId: string
  limitToUserId?: string
  createForUser: (userId: string) => Promise<number>
}): Promise<number> {
  const userIds = params.limitToUserId
    ? [params.limitToUserId]
    : await listOrganizationMemberIds(params.organizationId)

  let created = 0
  for (const userId of userIds) {
    created += await params.createForUser(userId)
  }
  return created
}

export async function createNotificationsForUser(
  notificationRepository: NotificationRepository,
  params: CreateUserNotificationParams
): Promise<number> {
  let created = 0

  for (const channel of params.rule.channels) {
    const dedupeKey = params.dedupeKeyBuilder(params.userId, channel)

    if (!params.skipDedupe && (await notificationRepository.existsByDedupeKey(dedupeKey))) {
      continue
    }

    const notification = await notificationRepository.create({
      organizationId: params.organizationId || params.rule.organizationId,
      userId: params.userId,
      alertRuleId: params.rule.id,
      transactionId: params.transactionId,
      accountId: params.accountId,
      title: params.title,
      body: params.body,
      channel,
      status: channel === 'in_app' || channel === 'extension' ? 'sent' : 'pending',
      sentAt: channel === 'in_app' || channel === 'extension' ? new Date() : null,
      dedupeKey,
      metadata: params.metadata,
    })

    if (notification) {
      created += 1
    }
  }

  return created
}

export async function createExternalNotification(
  notificationRepository: NotificationRepository,
  params: CreateExternalNotificationParams
): Promise<number> {
  if (!params.rule.channels.includes('whatsapp')) {
    return 0
  }

  if (await notificationRepository.existsByDedupeKey(params.dedupeKey)) {
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
    dedupeKey: params.dedupeKey,
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
