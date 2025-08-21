import { and, eq, gte, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { tags as tagsTable } from '@/db/schemas/tags'
import { transactionTags } from '@/db/schemas/transactionTags'
import type { UpdateTransactionSchemaBody } from '@/http/schemas/transaction/update-transaction.schema'
import { materializeOccurrences } from './materialize-occurrences'

interface UpdateTransactionParams extends Omit<UpdateTransactionSchemaBody, 'payToEmail'> {
  id: string
  ownerId: string
  organizationId: string
  payToId: string
}

export async function updateTransactionService({
  id: occurrenceId,
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
  tags,
}: UpdateTransactionParams) {
  const [occurrence] = await db
    .select()
    .from(transactionOccurrences)
    .where(eq(transactionOccurrences.id, occurrenceId))

  if (!occurrence) return { series: undefined }

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
    .where(eq(transactionSeries.id, occurrence.seriesId))
    .returning()

  if (!series) return { series: undefined }

  if (tags) {
    const names = tags.map(t => t.name)
    const existing = await db
      .select()
      .from(tagsTable)
      .where(and(eq(tagsTable.organizationId, organizationId), inArray(tagsTable.name, names)))

    const existingMap = new Map(existing.map(tag => [tag.name, tag.id]))
    const toCreate = tags.filter(tag => !existingMap.has(tag.name))

    if (toCreate.length > 0) {
      const inserted = await db
        .insert(tagsTable)
        .values(
          toCreate.map(tag => ({
            name: tag.name,
            color: tag.color,
            organizationId,
          }))
        )
        .returning()
      for (const tag of inserted) {
        existingMap.set(tag.name, tag.id)
      }
    }

    await db.delete(transactionTags).where(eq(transactionTags.transactionId, series.id))

    const rows = names.map(name => ({
      transactionId: series.id,
      tagId: existingMap.get(name)!,
    }))

    if (rows.length > 0) {
      await db.insert(transactionTags).values(rows)
    }
  } else {
    await db.delete(transactionTags).where(eq(transactionTags.transactionId, series.id))
  }

  await db
    .update(transactionOccurrences)
    .set({ status: 'canceled' })
    .where(
      and(
        eq(transactionOccurrences.seriesId, series.id),
        eq(transactionOccurrences.status, 'pending'),
        gte(transactionOccurrences.dueDate, new Date())
      )
    )

  await materializeOccurrences(series.id)

  return { series }
}
