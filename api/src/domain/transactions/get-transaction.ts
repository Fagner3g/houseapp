import { eq, getTableColumns, sql } from 'drizzle-orm'

import { db } from '@/db'
import { tags as tagsTable } from '@/db/schemas/tags'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { transactionTags } from '@/db/schemas/transactionTags'
import { users } from '@/db/schemas/users'

interface GetTransactionRequest {
  id: string
}

export async function getTransaction({ id }: GetTransactionRequest) {
  const result = await db
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
    .where(eq(transactionOccurrences.id, id))
    .groupBy(transactionOccurrences.id, transactionSeries.title, transactionSeries.type, users.name)

  const transaction = result[0]

  return { transaction }
}
