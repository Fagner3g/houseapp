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

  const sub = db
    .select({ id: transactionSeries.id })
    .from(transactionSeries)
    .where(
      and(
        eq(transactionSeries.ownerId, ownerId),
        eq(transactionSeries.organizationId, organizationId)
      )
    )

  await db
    .delete(transactionOccurrences)
    .where(
      and(inArray(transactionOccurrences.id, ids), inArray(transactionOccurrences.seriesId, sub))
    )
}
