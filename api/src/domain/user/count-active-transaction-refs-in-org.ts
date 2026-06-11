import { and, eq, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'

export async function countActiveTransactionRefsInOrg(orgId: string, userId: string) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(distinct ${transactionSeries.id})::int` })
    .from(transactionSeries)
    .where(
      and(
        eq(transactionSeries.organizationId, orgId),
        eq(transactionSeries.active, true),
        or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId)),
        or(
          sql`exists (
            select 1
            from ${transactionOccurrences}
            where ${transactionOccurrences.seriesId} = ${transactionSeries.id}
              and ${transactionOccurrences.status} in ('pending', 'partial')
          )`,
          sql`(
            ${transactionSeries.installmentsTotal} is not null
            and (
              select count(*)::int
              from ${transactionOccurrences}
              where ${transactionOccurrences.seriesId} = ${transactionSeries.id}
                and ${transactionOccurrences.status} = 'paid'
            ) < ${transactionSeries.installmentsTotal}
            and exists (
              select 1
              from ${transactionOccurrences}
              where ${transactionOccurrences.seriesId} = ${transactionSeries.id}
                and ${transactionOccurrences.status} != 'canceled'
            )
          )`
        )
      )
    )

  return count
}
