import { db } from '@/db'
import { expenses } from '@/db/schemas/expenses'

interface CreateExpenseRequest {
  title: string
  ownerId: string
  payToId: string
  organizationId: string
  amount: number
  dueDate: Date
  description?: string
}

export async function createExpense({
  title,
  ownerId,
  payToId,
  organizationId,
  amount,
  dueDate,
  description,
}: CreateExpenseRequest) {
  const result = await db
    .insert(expenses)
    .values({
      title,
      ownerId,
      payToId,
      organizationId,
      amount,
      dueDate,
      description,
    })
    .returning()

  const expense = result[0]

  return { expense }
}
