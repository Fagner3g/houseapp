import { and, eq, inArray, sql } from 'drizzle-orm'

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

  // TODO: create rotine to delete transactions 6 months

  await db.transaction(async trx => {
    await trx
      .update(transactionSeries)
      .set({ active: false, updatedAt: sql`now()` })
      .where(
        and(
          inArray(transactionSeries.id, ids),
          eq(transactionSeries.ownerId, ownerId),
          eq(transactionSeries.organizationId, organizationId)
        )
      )

    await trx
      .update(transactionOccurrences)
      .set({ status: 'canceled', updatedAt: sql`now()` })
      .where(inArray(transactionOccurrences.seriesId, ids))
  })
}
