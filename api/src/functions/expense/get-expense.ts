import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { expenses } from '@/db/schema'

interface GetExpenseRequest {
  id: string
}

export async function getExpense({ id }: GetExpenseRequest) {
  const result = await db.select().from(expenses).where(eq(expenses.id, id))

  const expense = result[0]

  return { expense }
}
