import { and, eq, inArray, sql } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'

type DbClient = Pick<typeof db, 'select' | 'update'>

export async function deactivateSeriesIfComplete(seriesId: string, trx: DbClient = db) {
  const [series] = await trx
    .select({
      active: transactionSeries.active,
      installmentsTotal: transactionSeries.installmentsTotal,
    })
    .from(transactionSeries)
    .where(eq(transactionSeries.id, seriesId))
    .limit(1)

  if (!series?.active || series.installmentsTotal == null) return

  const [unpaid] = await trx
    .select({ id: transactionOccurrences.id })
    .from(transactionOccurrences)
    .where(
      and(
        eq(transactionOccurrences.seriesId, seriesId),
        inArray(transactionOccurrences.status, ['pending', 'partial'])
      )
    )
    .limit(1)

  if (unpaid) return

  const [{ paid }] = await trx
    .select({ paid: sql<number>`count(*)::int` })
    .from(transactionOccurrences)
    .where(
      and(
        eq(transactionOccurrences.seriesId, seriesId),
        eq(transactionOccurrences.status, 'paid')
      )
    )

  if (paid >= series.installmentsTotal) {
    await trx
      .update(transactionSeries)
      .set({ active: false, updatedAt: sql`now()` })
      .where(eq(transactionSeries.id, seriesId))
  }
}
