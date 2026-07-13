import { and, eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { notifications } from '@/db/schemas/notifications'

const START_OF_TODAY_SP =
  sql`(date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')`

/** Deletes today's notifications for an org so alert dedupe keys can fire again. */
export async function clearTodayOrgNotifications(organizationId: string): Promise<number> {
  const deleted = await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.organizationId, organizationId),
        sql`${notifications.createdAt} >= ${START_OF_TODAY_SP}`
      )
    )
    .returning({ id: notifications.id })

  return deleted.length
}
