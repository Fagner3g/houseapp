import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { transactions } from '@/db/schemas/transactions'

interface GetTransactionRequest {
  id: string
}

export async function getTransaction({ id }: GetTransactionRequest) {
  const result = await db.select().from(transactions).where(eq(transactions.id, id))

  const transaction = result[0]

  return { transaction }
}
