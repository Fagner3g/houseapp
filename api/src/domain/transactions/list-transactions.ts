import { and, desc, eq, getTableColumns, inArray, sql } from 'drizzle-orm'

import { db } from '@/db'
import { tags as tagsTable } from '@/db/schemas/tags'
import { transactions } from '@/db/schemas/transactions'
import { transactionTags } from '@/db/schemas/transactionTags'
import { users } from '@/db/schemas/users'

interface ListTransactionsRequest {
  userId: string
  orgId: string
  tags?: string[]
  tagFilterMode?: 'any' | 'all'
}

export async function listTransactionsService({
  userId,
  orgId,
  tags = [],
  tagFilterMode = 'any',
}: ListTransactionsRequest) {
  let where = and(eq(transactions.ownerId, userId), eq(transactions.organizationId, orgId))

  if (tags.length > 0) {
    if (tagFilterMode === 'all') {
      const sub = db
        .select({ id: transactionTags.transactionId })
        .from(transactionTags)
        .innerJoin(tagsTable, eq(transactionTags.tagId, tagsTable.id))
        .where(inArray(tagsTable.name, tags))
        .groupBy(transactionTags.transactionId)
        .having(sql`count(distinct ${tagsTable.name}) = ${tags.length}`)

      where = and(where, inArray(transactions.id, sub))
    } else {
      where = and(where, inArray(tagsTable.name, tags))
    }
  }

  const result = await db
    .select({
      ...getTableColumns(transactions),
      payTo: users.name,
      tags: sql<string[]>`coalesce(array_agg(distinct ${tagsTable.name}), array[]::text[])`,
      status: sql /*sql*/`
      CASE
        WHEN ${transactions.paidAt} IS NOT NULL THEN 'paid'
        WHEN ${transactions.paidAt} IS NULL AND ${transactions.dueDate}::date > CURRENT_DATE THEN 'scheduled'
        ELSE 'overdue'
      END`,
    })
    .from(transactions)
    .innerJoin(users, eq(transactions.payToId, users.id))
    .leftJoin(transactionTags, eq(transactionTags.transactionId, transactions.id))
    .leftJoin(tagsTable, eq(transactionTags.tagId, tagsTable.id))
    .where(where)
    .groupBy(transactions.id, users.name)
    .orderBy(desc(transactions.dueDate))

  return { transactions: result }
}
