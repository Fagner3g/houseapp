import { and, eq, or } from 'drizzle-orm'

import { db } from '@/db'
import { expenses } from '@/db/schema'

interface ListExpensesRequest {
  userId: string
  organizationId: string
}

export async function listExpenses({ userId, organizationId }: ListExpensesRequest) {
  const result = await db
    .select()
    .from(expenses)
    .where(
      and(
        or(eq(expenses.ownerId, userId), eq(expenses.payToId, userId)),
        eq(expenses.organizationId, organizationId)
      )
    )

  return { expenses: result }
}
