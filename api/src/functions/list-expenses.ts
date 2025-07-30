import { eq, or } from 'drizzle-orm'

import { db } from '../db'
import { expenses } from '../db/schema'

interface ListExpensesRequest {
  userId: string
}

export async function listExpenses({ userId }: ListExpensesRequest) {
  const result = await db
    .select()
    .from(expenses)
    .where(or(eq(expenses.ownerId, userId), eq(expenses.payToId, userId)))

  return { expenses: result }
}
