import { and, desc, eq, gte } from 'drizzle-orm'

import { db } from '@/db'
import { alertDeliveries } from '@/db/schemas/alertDeliveries'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import type { AlertDeliveryDto } from '../types'
import { dedupeDeliveriesByLogicalAlert } from '../utils'

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
    .select({
      delivery: alertDeliveries,
      recipientName: users.name,
    })
    .from(alertDeliveries)
    .innerJoin(users, eq(alertDeliveries.userId, users.id))
    .innerJoin(
      userOrganizations,
      and(
        eq(userOrganizations.userId, alertDeliveries.userId),
        eq(userOrganizations.organizationId, alertDeliveries.organizationId)
      )
    )
    .where(
      and(
        eq(alertDeliveries.organizationId, orgId),
        eq(alertDeliveries.status, 'sent'),
        gte(alertDeliveries.sentAt, cutoff)
      )
    )
    .orderBy(desc(alertDeliveries.sentAt))
    .limit(limit * 3)

  const alerts: AlertDeliveryDto[] = dedupeDeliveriesByLogicalAlert(
    rows.map(({ delivery: row, recipientName }) => ({
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId,
      recipientName,
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
  )
    .sort((a, b) => {
      const aTime = a.sentAt ?? a.createdAt
      const bTime = b.sentAt ?? b.createdAt
      return bTime.localeCompare(aTime)
    })
    .slice(0, limit)

  return { alerts }
}
