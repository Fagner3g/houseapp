import { and, desc, eq, getTableColumns, sql } from 'drizzle-orm'

import { db } from '@/db'
import { transactions } from '@/db/schemas/transactions'
import { users } from '@/db/schemas/users'

interface ListTransactionsRequest {
  userId: string
  orgId: string
}

export async function listTransactionsService({ userId, orgId }: ListTransactionsRequest) {
  const result = await db
    .select({
      ...getTableColumns(transactions),
      payTo: users.name,
      status: sql /*sql*/`
      CASE 
        WHEN ${transactions.paidAt} IS NOT NULL THEN 'paid'
        WHEN ${transactions.paidAt} IS NULL AND ${transactions.dueDate}::date > CURRENT_DATE THEN 'scheduled'
        ELSE 'overdue'
      END`,
    })
    .from(transactions)
    .innerJoin(users, eq(transactions.payToId, users.id))
    .where(and(eq(transactions.ownerId, userId), eq(transactions.organizationId, orgId)))
    .orderBy(desc(transactions.dueDate))

  return { transactions: result }
}
