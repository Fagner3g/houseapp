import { and, desc, eq, getTableColumns, gte, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm'

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
  type?: 'all' | 'income' | 'expense'
  dateFrom: Date
  dateTo: Date
  page: number
  perPage: number
}

export async function listTransactionsService({
  userId,
  orgId,
  tags = [],
  tagFilterMode = 'any',
  type = 'all',
  dateFrom,
  dateTo,
  page,
  perPage,
}: ListTransactionsRequest) {
  const base = and(eq(transactions.ownerId, userId), eq(transactions.organizationId, orgId))

  // dentro do range selecionado OU (não paga e vencida no passado)
  const inSelectedRange = and(
    gte(transactions.dueDate, dateFrom),
    lte(transactions.dueDate, dateTo)
  )
  const overdueAndUnpaid = and(isNull(transactions.paidAt), lt(transactions.dueDate, new Date()))

  let where = and(base, or(inSelectedRange, overdueAndUnpaid))

  if (type !== 'all') {
    where = and(where, eq(transactions.type, type))
  }

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

  const [result, total] = await Promise.all([
    db
      .select({
        ...getTableColumns(transactions),
        payTo: users.name,
        tags: sql<{ name: string; color: string }[]>`
          coalesce(
            jsonb_agg(distinct jsonb_build_object('name', ${tagsTable.name}, 'color', ${tagsTable.color}))
              filter (where ${tagsTable.id} is not null),
            '[]'::jsonb
          )
        `,
        status: sql /*sql*/`
        CASE
          WHEN ${transactions.paidAt} IS NOT NULL THEN 'paid'
          WHEN ${transactions.paidAt} IS NULL AND ${transactions.dueDate}::date > CURRENT_DATE THEN 'scheduled'
          ELSE 'overdue'
        END`,
        overdueDays: sql<number>`
          CASE
            WHEN ${transactions.paidAt} IS NOT NULL OR ${transactions.dueDate}::date >= CURRENT_DATE THEN 0
            ELSE GREATEST(0, (CURRENT_DATE - ${transactions.dueDate}::date))
          END
        `,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.payToId, users.id))
      .leftJoin(transactionTags, eq(transactionTags.transactionId, transactions.id))
      .leftJoin(tagsTable, eq(transactionTags.tagId, tagsTable.id))
      .where(where)
      .groupBy(transactions.id, users.name)
      .orderBy(desc(transactions.dueDate))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({
        value: sql<number>`count(distinct ${transactions.id})`,
      })
      .from(transactions)
      .leftJoin(transactionTags, eq(transactionTags.transactionId, transactions.id))
      .leftJoin(tagsTable, eq(transactionTags.tagId, tagsTable.id))
      .where(where),
  ])

  const totalItems = Number(total[0]?.value) ?? 0
  const totalPages = Math.ceil(totalItems / perPage)
  const pagesRemaining = Math.max(0, totalPages - page)

  return {
    transactions: result,
    page,
    perPage,
    totalItems,
    totalPages,
    pagesRemaining,
  }
}
