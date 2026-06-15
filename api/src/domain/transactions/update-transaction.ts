import { and, eq, inArray, sql } from 'drizzle-orm'

import { db } from '@/db'
import { tags as tagsTable } from '@/db/schemas/tags'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { transactionTags } from '@/db/schemas/transactionTags'
import { getUser } from '@/domain/user/get-user'
import type { UpdateTransactionSchemaBody } from '@/http/schemas/transaction/update-transaction.schema'

import { resolveTransactionUpdateScope } from './update-transaction-scope'

interface UpdateTransactionParams extends UpdateTransactionSchemaBody {
  ownerId: string
  occurrenceId: string
  organizationId: string
}

async function syncTransactionTags(
  trx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  serieId: string,
  organizationId: string,
  tags: NonNullable<UpdateTransactionSchemaBody['tags']>
) {
  await trx.delete(transactionTags).where(eq(transactionTags.transactionId, serieId))

  if (tags.length === 0) return

  const names = tags.map(t => t.name)
  const existing = await trx
    .select()
    .from(tagsTable)
    .where(and(eq(tagsTable.organizationId, organizationId), inArray(tagsTable.name, names)))

  const existingMap = new Map(existing.map(tag => [tag.name, tag.id]))
  const toCreate = tags.filter(tag => !existingMap.has(tag.name))

  if (toCreate.length > 0) {
    const inserted = await trx
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

  const rows = names.flatMap(name => {
    const tagId = existingMap.get(name)
    return tagId ? [{ transactionId: serieId, tagId }] : []
  })
  if (rows.length > 0) {
    await trx.insert(transactionTags).values(rows)
  }
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
  tags = [],
  payToEmail,
  ownerId,
  updateSeries,
}: UpdateTransactionParams) {
  const scope = resolveTransactionUpdateScope(updateSeries)

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

    if (scope.series.title || scope.series.type || scope.series.amount || scope.series.payToEmail) {
      let payToId: string | undefined
      if (scope.series.payToEmail && payToEmail) {
        const user = await getUser({ email: payToEmail })
        if (!user) throw new Error('Usuário não encontrado')
        payToId = user.id
      }

      await trx
        .update(transactionSeries)
        .set({
          ...(scope.series.title && { title }),
          ...(scope.series.type && { type }),
          ...(scope.series.amount && { amount }),
          ...(payToId && { payToId }),
          updatedAt: sql`now()`,
        })
        .where(eq(transactionSeries.id, serieId))
    }

    const pendingStatus = eq(transactionOccurrences.status, 'pending')

    if (scope.pendingOccurrences.amount || scope.pendingOccurrences.description) {
      await trx
        .update(transactionOccurrences)
        .set({
          ...(scope.pendingOccurrences.amount && { amount }),
          ...(scope.pendingOccurrences.description && { description }),
          updatedAt: sql`now()`,
        })
        .where(and(eq(transactionOccurrences.seriesId, serieId), pendingStatus))
    }

    const currentOccurrenceFields = {
      ...(scope.currentOccurrence.amount && { amount }),
      ...(scope.currentOccurrence.description && { description }),
      ...(scope.currentOccurrence.dueDate && { dueDate }),
    }

    if (Object.keys(currentOccurrenceFields).length > 0) {
      await trx
        .update(transactionOccurrences)
        .set({
          ...currentOccurrenceFields,
          updatedAt: sql`now()`,
        })
        .where(and(eq(transactionOccurrences.id, occurrenceId), pendingStatus))
    }

    if (scope.tags && tags) {
      await syncTransactionTags(trx, serieId, organizationId, tags)
    }
  })
}
