import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { transactions } from '@/db/schemas/transactions'

interface ListTransactionsRequest {
  userId: string
  orgId: string
}

export async function listTransactions({ userId, orgId }: ListTransactionsRequest) {
  const result = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.ownerId, userId), eq(transactions.organizationId, orgId)))

  return { transactions: result }
}
