import { and, eq, inArray, sql } from 'drizzle-orm'

import { db } from '@/db'
import { notifications } from '@/db/schemas/notifications'
import { splitPaymentRequests } from '@/db/schemas/splitPaymentRequests'

const DECISION_KIND = 'split_payment_request'

/** Marks decision notifications as read for the given payment request IDs. */
export async function dismissDecisionNotificationsForRequests(
  requestIds: string[]
): Promise<number> {
  if (requestIds.length === 0) return 0

  const updated = await db
    .update(notifications)
    .set({
      status: 'read',
      readAt: new Date(),
    })
    .where(
      and(
        inArray(notifications.status, ['pending', 'sent']),
        sql`coalesce(${notifications.metadata}->>'kind', '') = ${DECISION_KIND}`,
        inArray(sql<string>`${notifications.metadata}->>'requestId'`, requestIds)
      )
    )
    .returning({ id: notifications.id })

  return updated.length
}

/** Returns the subset of request IDs that are still pending. */
export async function findPendingPaymentRequestIds(requestIds: string[]): Promise<Set<string>> {
  if (requestIds.length === 0) return new Set()

  const rows = await db
    .select({ id: splitPaymentRequests.id })
    .from(splitPaymentRequests)
    .where(
      and(
        inArray(splitPaymentRequests.id, requestIds),
        eq(splitPaymentRequests.status, 'pending')
      )
    )

  return new Set(rows.map(row => row.id))
}
