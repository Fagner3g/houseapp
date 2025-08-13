import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { tags as tagsTable } from '@/db/schemas/tags'
import { transactions } from '@/db/schemas/transactions'
import { transactionTags } from '@/db/schemas/transactionTags'
import type { CreateTransactionsSchemaBody } from '@/http/schemas/transaction/create-transaction.schema'

type CreateTransaction = Omit<CreateTransactionsSchemaBody, 'payToEmail'> & {
  ownerId: string
  organizationId: string
  payToId: string
}

export async function createTransactionService({
  type,
  title,
  ownerId,
  payToId,
  organizationId,
  amount,
  dueDate,
  description,
  tags = [],
}: CreateTransaction) {
  const result = await db
    .insert(transactions)
    .values({
      type,
      title,
      ownerId,
      payToId,
      organizationId,
      amount,
      dueDate,
      description,
    })
    .returning()

  const transaction = result[0]

  if (tags.length > 0) {
    const existing = await db
      .select()
      .from(tagsTable)
      .where(and(eq(tagsTable.organizationId, organizationId), inArray(tagsTable.name, tags)))

    const existingMap = new Map(existing.map(tag => [tag.name, tag.id]))
    const toCreate = tags.filter(name => !existingMap.has(name))

    if (toCreate.length > 0) {
      const inserted = await db
        .insert(tagsTable)
        .values(toCreate.map(name => ({ name, organizationId })))
        .returning()
      for (const tag of inserted) {
        existingMap.set(tag.name, tag.id)
      }
    }

    const rows = tags.map(name => ({
      transactionId: transaction.id,
      tagId: existingMap.get(name)!,
    }))
    if (rows.length > 0) {
      await db.insert(transactionTags).values(rows)
    }
  }

  return { transaction }
}
