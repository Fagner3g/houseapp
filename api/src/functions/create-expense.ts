import { db } from '../db'
import { expenses } from '../db/schema'

interface CreateExpenseRequest {
  userId: string
  title: string
  payTo: string
  amount: number
  dueDate: Date
}

export async function createExpense({
  userId,
  title,
  payTo,
  amount,
  dueDate,
}: CreateExpenseRequest) {
  const [expense] = await db
    .insert(expenses)
    .values({ userId, title, payTo, amount, dueDate })
    .returning()

  return { expense }
}
