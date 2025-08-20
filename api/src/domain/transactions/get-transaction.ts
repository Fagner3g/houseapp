import { eq, getTableColumns } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
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
      ownerId: transactionSeries.ownerId,
      payToId: transactionSeries.payToId,
      organizationId: transactionSeries.organizationId,
      payToName: users.name,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .leftJoin(users, eq(transactionSeries.payToId, users.id))
    .where(eq(transactionOccurrences.id, id))

  const transaction = result[0]

  return { transaction }
}
