import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'

interface DeleteTransactionsRequest {
  ids: string[]
  ownerId: string
  organizationId: string
}

export async function deleteTransactionsService({
  ids,
  ownerId,
  organizationId,
}: DeleteTransactionsRequest) {
  if (ids.length === 0) return

  const occurrences = await db
    .select({ seriesId: transactionOccurrences.seriesId })
    .from(transactionOccurrences)
    .where(inArray(transactionOccurrences.id, ids))

  const seriesIds = [...new Set(occurrences.map(o => o.seriesId))]

  if (seriesIds.length === 0) return

  await db
    .delete(transactionSeries)
    .where(
      and(
        inArray(transactionSeries.id, seriesIds),
        eq(transactionSeries.ownerId, ownerId),
        eq(transactionSeries.organizationId, organizationId)
      )
    )
}
