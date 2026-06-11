import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import type { AlertDeliveryStatus } from '@/db/schemas/alertDeliveries'
import { alertDeliveries } from '@/db/schemas/alertDeliveries'

const RETRYABLE_STATUSES: AlertDeliveryStatus[] = ['skipped', 'failed']

export async function hasBlockingDedupeKey(dedupeKey: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: alertDeliveries.id })
    .from(alertDeliveries)
    .where(
      and(
        eq(alertDeliveries.dedupeKey, dedupeKey),
        inArray(alertDeliveries.status, ['sent', 'pending'])
      )
    )
    .limit(1)

  return !!existing
}

export async function insertAlertDelivery(
  values: typeof alertDeliveries.$inferInsert
): Promise<(typeof alertDeliveries.$inferSelect) | null> {
  await db
    .delete(alertDeliveries)
    .where(
      and(
        eq(alertDeliveries.dedupeKey, values.dedupeKey),
        inArray(alertDeliveries.status, RETRYABLE_STATUSES)
      )
    )

  try {
    const [delivery] = await db.insert(alertDeliveries).values(values).returning()
    return delivery ?? null
  } catch (err) {
    const cause = (err as { cause?: { code?: string } }).cause
    if (cause?.code === '23505') return null
    throw err
  }
}
