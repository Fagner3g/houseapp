import { and, eq, or } from 'drizzle-orm'

import { db } from '@/db'
import { expenses } from '@/db/schemas/expenses'

interface ListExpensesRequest {
  userId: string
  orgId: string
}

export async function listExpenses({ userId, orgId }: ListExpensesRequest) {
  const result = await db
    .select()
    .from(expenses)
    .where(
      and(
        or(eq(expenses.ownerId, userId), eq(expenses.payToId, userId)),
        eq(expenses.organizationId, orgId)
      )
    )

  return { expenses: result }
}
