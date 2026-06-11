import { and, desc, eq, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { alertDeliveries } from '@/db/schemas/alertDeliveries'
import type { AlertDeliveryDto } from '../types'

interface ListInboxRequest {
  orgId: string
  userId: string
  unreadOnly?: boolean
}

export async function listInboxService({ orgId, userId, unreadOnly }: ListInboxRequest) {
  const conditions = [
    eq(alertDeliveries.organizationId, orgId),
    eq(alertDeliveries.userId, userId),
    eq(alertDeliveries.channel, 'in_app'),
  ]

  if (unreadOnly) {
    conditions.push(isNull(alertDeliveries.readAt))
  }

  const rows = await db
    .select()
    .from(alertDeliveries)
    .where(and(...conditions))
    .orderBy(desc(alertDeliveries.createdAt))

  const alerts: AlertDeliveryDto[] = rows.map(row => ({
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    sourceType: row.sourceType,
    ruleId: row.ruleId,
    reminderId: row.reminderId,
    occurrenceId: row.occurrenceId,
    kind: row.kind,
    channel: row.channel,
    status: row.status,
    payload: row.payload,
    sentAt: row.sentAt?.toISOString() ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    ackedAt: row.ackedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }))

  return { alerts }
}
