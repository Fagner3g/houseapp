import { and, eq, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { transactionSeries } from '@/db/schemas/transactionSeries'

/** Any series in the org where the user is owner or pay_to (active or inactive). */
export async function countTransactionRefsInOrg(orgId: string, userId: string) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(distinct ${transactionSeries.id})::int` })
    .from(transactionSeries)
    .where(
      and(
        eq(transactionSeries.organizationId, orgId),
        or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
      )
    )

  return count
}
