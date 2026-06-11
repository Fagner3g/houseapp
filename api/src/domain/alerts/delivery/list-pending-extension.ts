import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { alertDeliveries } from '@/db/schemas/alertDeliveries'
import { organizations } from '@/db/schemas/organization'

interface ListPendingExtensionRequest {
  userId: string
}

export async function listPendingExtensionAlertsService({ userId }: ListPendingExtensionRequest) {
  const rows = await db
    .select({
      delivery: alertDeliveries,
      orgSlug: organizations.slug,
      orgName: organizations.name,
    })
    .from(alertDeliveries)
    .innerJoin(organizations, eq(alertDeliveries.organizationId, organizations.id))
    .where(
      and(
        eq(alertDeliveries.userId, userId),
        eq(alertDeliveries.channel, 'extension'),
        eq(alertDeliveries.status, 'pending')
      )
    )
    .orderBy(alertDeliveries.createdAt)

  return {
    alerts: rows.map(row => ({
      id: row.delivery.id,
      organizationId: row.delivery.organizationId,
      userId: row.delivery.userId,
      sourceType: row.delivery.sourceType,
      ruleId: row.delivery.ruleId,
      reminderId: row.delivery.reminderId,
      occurrenceId: row.delivery.occurrenceId,
      kind: row.delivery.kind,
      channel: row.delivery.channel,
      status: row.delivery.status,
      payload: row.delivery.payload,
      sentAt: row.delivery.sentAt?.toISOString() ?? null,
      readAt: row.delivery.readAt?.toISOString() ?? null,
      ackedAt: row.delivery.ackedAt?.toISOString() ?? null,
      createdAt: row.delivery.createdAt.toISOString(),
      orgSlug: row.orgSlug,
      orgName: row.orgName,
    })),
  }
}
