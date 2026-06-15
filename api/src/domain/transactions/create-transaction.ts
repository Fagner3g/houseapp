import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { tags as tagsTable } from '@/db/schemas/tags'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { transactionTags } from '@/db/schemas/transactionTags'
import type { CreateTransactionsSchemaBody } from '@/http/schemas/transaction/create-transaction.schema'
import { materializeOccurrences } from './materialize-occurrences'
import { calculateTotalInstallments } from './utils/installments-calculator'
import { subPeriod } from '../recurrence/utils'

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

type CreateTransaction = Omit<CreateTransactionsSchemaBody, 'payToEmail'> & {
  ownerId: string
  organizationId: string
  payToId: string
}

export async function createTransactionService(
  {
    type,
    title,
    ownerId,
    payToId,
    organizationId,
    amount,
    dueDate,
    description,
    tags = [],
    isRecurring,
    recurrenceInterval,
    recurrenceType,
    recurrenceUntil,
    recurrenceStart,
    installmentsTotal,
  }: CreateTransaction,
  trx: DbExecutor = db
) {
  const startDate = (() => {
    if (recurrenceStart) return recurrenceStart
    return subPeriod(dueDate, recurrenceType ?? 'monthly', recurrenceInterval ?? 1)
  })()

  // Calcular o número total de parcelas usando a função utilitária
  const calculatedInstallmentsTotal = calculateTotalInstallments(
    isRecurring,
    recurrenceType,
    recurrenceInterval,
    recurrenceUntil,
    startDate,
    installmentsTotal
  )

  const seriesResult = await trx
    .insert(transactionSeries)
    .values({
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
      installmentsTotal: calculatedInstallmentsTotal,
    })
    .returning()

  const series = seriesResult[0]

  if (tags.length > 0) {
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

    const rows = names.map(name => ({
      transactionId: series.id,
      tagId: existingMap.get(name)!,
    }))
    if (rows.length > 0) {
      await trx.insert(transactionTags).values(rows)
    }
  }

  await materializeOccurrences(series.id, 6, description, trx)

  return { series }
}
