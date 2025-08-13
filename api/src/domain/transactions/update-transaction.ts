import { db } from '@/db'
import { transactions } from '@/db/schemas/transactions'
import type { UpdateTransactionSchemaBody } from '@/http/schemas/transaction/update-transaction.schema'
import { eq } from 'drizzle-orm'

interface UpdateTransactionParams extends Omit<UpdateTransactionSchemaBody, 'payToEmail'> {
  id: string
  ownerId: string
  organizationId: string
  payToId: string
}

export async function updateTransactionService({
  id,
  ownerId,
  organizationId,
  payToId,
  type,
  title,
  amount,
  dueDate,
  description,
  ..._rest
}: UpdateTransactionParams) {
  const result = await db
    .update(transactions)
    .set({
      type,
      title,
      ownerId,
      payToId,
      organizationId,
      amount,
      dueDate,
      description,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, id))
    .returning()

  return { transaction: result[0] }
}
