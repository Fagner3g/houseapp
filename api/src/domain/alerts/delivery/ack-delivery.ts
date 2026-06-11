import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { alertDeliveries } from '@/db/schemas/alertDeliveries'
import { BadRequestError } from '@/http/utils/error'

interface AckDeliveryRequest {
  id: string
  orgId: string
  userId: string
}

export async function ackAlertDeliveryService({ id, orgId, userId }: AckDeliveryRequest) {
  const [delivery] = await db
    .update(alertDeliveries)
    .set({
      ackedAt: new Date(),
      status: 'sent',
      sentAt: new Date(),
    })
    .where(
      and(
        eq(alertDeliveries.id, id),
        eq(alertDeliveries.organizationId, orgId),
        eq(alertDeliveries.userId, userId),
        eq(alertDeliveries.channel, 'extension')
      )
    )
    .returning()

  if (!delivery) {
    throw new BadRequestError('Alert not found')
  }

  return {
    alert: {
      id: delivery.id,
      ackedAt: delivery.ackedAt?.toISOString() ?? null,
      status: delivery.status,
    },
  }
}
