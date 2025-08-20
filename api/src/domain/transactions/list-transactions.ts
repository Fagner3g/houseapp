import { and, desc, eq, getTableColumns, gte, inArray, lt, lte, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { tags as tagsTable } from '@/db/schemas/tags'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
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
  const base = and(
    eq(transactionSeries.ownerId, userId),
    eq(transactionSeries.organizationId, orgId),
    eq(transactionSeries.active, true)
  )

  const inSelectedRange = and(
    gte(transactionOccurrences.dueDate, dateFrom),
    lte(transactionOccurrences.dueDate, dateTo)
  )
  const overdueAndUnpaid = and(
    eq(transactionOccurrences.status, 'pending'),
    lt(transactionOccurrences.dueDate, new Date())
  )

  let where = and(base, or(inSelectedRange, overdueAndUnpaid))

  if (type !== 'all') {
    where = and(where, eq(transactionSeries.type, type))
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

      where = and(where, inArray(transactionSeries.id, sub))
    } else {
      where = and(where, inArray(tagsTable.name, tags))
    }
  }

  const [result, total] = await Promise.all([
    db
      .select({
        ...getTableColumns(transactionOccurrences),
        title: transactionSeries.title,
        type: transactionSeries.type,
        payTo: users.name,
        tags: sql<{ name: string; color: string }[]>`
          coalesce(
            jsonb_agg(distinct jsonb_build_object('name', ${tagsTable.name}, 'color', ${tagsTable.color}))
              filter (where ${tagsTable.id} is not null),
            '[]'::jsonb
          )
        `,
        status: transactionOccurrences.status,
        overdueDays: sql<number>`
          CASE
            WHEN ${transactionOccurrences.status} = 'pending' AND ${transactionOccurrences.dueDate}::date < CURRENT_DATE THEN GREATEST(0, (CURRENT_DATE - ${transactionOccurrences.dueDate}::date))
            ELSE 0
          END
        `,
      })
      .from(transactionOccurrences)
      .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
      .innerJoin(users, eq(transactionSeries.payToId, users.id))
      .leftJoin(transactionTags, eq(transactionTags.transactionId, transactionSeries.id))
      .leftJoin(tagsTable, eq(transactionTags.tagId, tagsTable.id))
      .where(where)
      .groupBy(
        transactionOccurrences.id,
        transactionSeries.title,
        transactionSeries.type,
        users.name
      )
      .orderBy(desc(transactionOccurrences.dueDate))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({
        value: sql<number>`count(distinct ${transactionOccurrences.id})`,
      })
      .from(transactionOccurrences)
      .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
      .leftJoin(transactionTags, eq(transactionTags.transactionId, transactionSeries.id))
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
