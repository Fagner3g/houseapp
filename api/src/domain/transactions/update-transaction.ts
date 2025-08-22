import { and, eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import type { UpdateTransactionSchemaBody } from '@/http/schemas/transaction/update-transaction.schema'

interface UpdateTransactionParams extends UpdateTransactionSchemaBody {
  ownerId: string
  occurrenceId: string
  organizationId: string
  updateSerie?: boolean
}

export async function updateTransactionService({
  occurrenceId,
  serieId,
  organizationId,
  type,
  title,
  amount,
  dueDate,
  description,
  ownerId,
}: UpdateTransactionParams) {
  await db.transaction(async trx => {
    const [serie] = await trx
      .select({ title: transactionSeries.title, type: transactionSeries.type })
      .from(transactionSeries)
      .where(
        and(
          eq(transactionSeries.id, serieId),
          eq(transactionSeries.ownerId, ownerId),
          eq(transactionSeries.organizationId, organizationId)
        )
      )

    if (!serie) throw new Error('Serie not found')

    await trx
      .update(transactionSeries)
      .set({ title, type, updatedAt: sql`now()` })
      .where(eq(transactionSeries.id, serieId))

    await trx
      .update(transactionOccurrences)
      .set({
        amount,
        dueDate,
        description,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(transactionOccurrences.id, occurrenceId),
          eq(transactionOccurrences.status, 'pending')
        )
      )
  })
}
