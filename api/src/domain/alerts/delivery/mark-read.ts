import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { alertDeliveries } from '@/db/schemas/alertDeliveries'
import { BadRequestError } from '@/http/utils/error'

interface MarkReadRequest {
  id: string
  orgId: string
  userId: string
}

export async function markAlertReadService({ id, orgId, userId }: MarkReadRequest) {
  const [delivery] = await db
    .update(alertDeliveries)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(alertDeliveries.id, id),
        eq(alertDeliveries.organizationId, orgId),
        eq(alertDeliveries.userId, userId),
        eq(alertDeliveries.channel, 'in_app')
      )
    )
    .returning()

  if (!delivery) {
    throw new BadRequestError('Alert not found')
  }

  return {
    alert: {
      id: delivery.id,
      readAt: delivery.readAt?.toISOString() ?? null,
    },
  }
}
