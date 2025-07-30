import { eq } from 'drizzle-orm'

import { db } from '../db'
import { expenses } from '../db/schema'

interface ListExpensesRequest {
  userId: string
}

export async function listExpenses({ userId }: ListExpensesRequest) {
  const result = await db.select().from(expenses).where(eq(expenses.userId, userId))

  return { expenses: result }
}
