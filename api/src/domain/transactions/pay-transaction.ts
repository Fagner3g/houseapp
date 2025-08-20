import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { transactions } from '@/db/schemas/transactions'

interface PayTransactionParams {
  id: string
}

export async function payTransactionService({ id }: PayTransactionParams) {
  const [existing] = await db.select().from(transactions).where(eq(transactions.id, id))
  if (!existing) return { transaction: undefined }

  let installmentsPaid = existing.installmentsPaid
  if (existing.isRecurring) {
    const total = existing.installmentsTotal ?? Infinity
    installmentsPaid = Math.min(total, installmentsPaid + 1)
  }

  const [updated] = await db
    .update(transactions)
    .set({ paidAt: new Date(), installmentsPaid })
    .where(eq(transactions.id, id))
    .returning()

  return { transaction: updated }
}
