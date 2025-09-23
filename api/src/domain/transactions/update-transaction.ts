import { and, eq, inArray, sql } from 'drizzle-orm'

import { db } from '@/db'
import { tags as tagsTable } from '@/db/schemas/tags'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { transactionTags } from '@/db/schemas/transactionTags'
import { getUser } from '@/domain/user/get-user'
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
  tags = [],
  payToEmail,
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

    // Se payToEmail foi fornecido, buscar o usuário e atualizar payToId
    let payToId: string | undefined
    if (payToEmail) {
      const user = await getUser({ email: payToEmail })
      if (!user) throw new Error('Usuário não encontrado')
      payToId = user.id
    }

    await trx
      .update(transactionSeries)
      .set({
        title,
        type,
        ...(payToId && { payToId }),
        updatedAt: sql`now()`,
      })
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

    // Processar tags se fornecidas
    if (tags) {
      // Remove todas as tags existentes da transação
      await trx.delete(transactionTags).where(eq(transactionTags.transactionId, serieId))

      // Adiciona as novas tags se houver
      if (tags.length > 0) {
        const names = tags.map(t => t.name)
        const existing = await trx
          .select()
          .from(tagsTable)
          .where(and(eq(tagsTable.organizationId, organizationId), inArray(tagsTable.name, names)))

        const existingMap = new Map(existing.map(tag => [tag.name, tag.id]))
        const toCreate = tags.filter(tag => !existingMap.has(tag.name))

        // Cria tags que não existem
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

        // Associa as tags à transação
        const rows = names.map(name => ({
          transactionId: serieId,
          tagId: existingMap.get(name)!,
        }))
        if (rows.length > 0) {
          await trx.insert(transactionTags).values(rows)
        }
      }
    }
  })
}
