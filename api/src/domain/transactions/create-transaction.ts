import { db } from '@/db'
import { transactions } from '@/db/schemas/transactions'
import type { CreateTransactionsSchemaBody } from '@/http/schemas/transaction/create-transaction.schema'

type CreateTransaction = Omit<CreateTransactionsSchemaBody, 'payToEmail'> & {
  ownerId: string
  organizationId: string
  payToId: string
}

export async function createTransactionService({
  type,
  title,
  ownerId,
  payToId,
  organizationId,
  amount,
  dueDate,
  description,
}: CreateTransaction) {
  const result = await db
    .insert(transactions)
    .values({
      type,
      title,
      ownerId,
      payToId,
      organizationId,
      amount,
      dueDate,
      description,
    })
    .returning()

  const transaction = result[0]

  return { transaction }
}
