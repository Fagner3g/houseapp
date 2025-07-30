import { and, eq } from 'drizzle-orm'

import { db } from '../db'
import { expenses } from '../db/schema'

interface GetExpenseRequest {
  id: string
  userId: string
}

export async function getExpense({ id, userId }: GetExpenseRequest) {
  const [expense] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))

  return { expense }
}
