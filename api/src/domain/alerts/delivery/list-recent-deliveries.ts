import { and, desc, eq, gte } from 'drizzle-orm'

import { db } from '@/db'
import { alertDeliveries } from '@/db/schemas/alertDeliveries'
import type { AlertDeliveryDto } from '../types'

interface ListRecentDeliveriesRequest {
  orgId: string
  hours?: number
  limit?: number
}

export async function listRecentDeliveriesService({
  orgId,
  hours = 24,
  limit = 50,
}: ListRecentDeliveriesRequest) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)

  const rows = await db
    .select()
    .from(alertDeliveries)
    .where(
      and(
        eq(alertDeliveries.organizationId, orgId),
        eq(alertDeliveries.status, 'sent'),
        gte(alertDeliveries.sentAt, cutoff)
      )
    )
    .orderBy(desc(alertDeliveries.sentAt))
    .limit(limit)

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
