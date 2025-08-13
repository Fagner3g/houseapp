import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { transactions } from '@/db/schemas/transactions'

interface DeleteTransactionsRequest {
  ids: string[]
  ownerId: string
  organizationId: string
}

export async function deleteTransactionsService({
  ids,
  ownerId,
  organizationId,
}: DeleteTransactionsRequest) {
  if (ids.length === 0) return

  await db
    .delete(transactions)
    .where(
      and(
        inArray(transactions.id, ids),
        eq(transactions.ownerId, ownerId),
        eq(transactions.organizationId, organizationId),
      ),
    )
}
