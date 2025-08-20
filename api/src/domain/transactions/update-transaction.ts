import { and, eq, gte } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import type { UpdateTransactionSchemaBody } from '@/http/schemas/transaction/update-transaction.schema'
import { materializeOccurrences } from './materialize-occurrences'

interface UpdateTransactionParams extends Omit<UpdateTransactionSchemaBody, 'payToEmail'> {
  id: string
  ownerId: string
  organizationId: string
  payToId: string
}

export async function updateTransactionService({
  id,
  ownerId,
  organizationId,
  payToId,
  type,
  title,
  amount,
  dueDate,
  isRecurring,
  recurrenceInterval,
  recurrenceType,
  recurrenceUntil,
  recurrenceStart,
  installmentsTotal,
}: UpdateTransactionParams) {
  const startDate = recurrenceStart ?? dueDate
  const [series] = await db
    .update(transactionSeries)
    .set({
      type,
      title,
      ownerId,
      payToId,
      organizationId,
      amount,
      startDate,
      recurrenceType: recurrenceType ?? 'monthly',
      recurrenceInterval: recurrenceInterval ?? 1,
      recurrenceUntil,
      installmentsTotal: installmentsTotal ?? (isRecurring ? null : 1),
      updatedAt: new Date(),
    })
    .where(eq(transactionSeries.id, id))
    .returning()

  if (!series) return { series: undefined }

  await db
    .update(transactionOccurrences)
    .set({ status: 'canceled' })
    .where(
      and(
        eq(transactionOccurrences.seriesId, id),
        eq(transactionOccurrences.status, 'pending'),
        gte(transactionOccurrences.dueDate, new Date())
      )
    )

  await materializeOccurrences(id)

  return { series }
}
