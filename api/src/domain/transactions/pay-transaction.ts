import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'

interface PayTransactionParams {
  id: string
  valuePaid?: number
  paidAt?: Date
}

export async function payTransactionService({ id, valuePaid, paidAt }: PayTransactionParams) {
  const [existing] = await db
    .select()
    .from(transactionOccurrences)
    .where(eq(transactionOccurrences.id, id))
  if (!existing) return { occurrence: undefined }

  const isPaid = existing.status === 'paid'

  const [updated] = await db
    .update(transactionOccurrences)
    .set(
      isPaid
        ? { status: 'pending', paidAt: null, valuePaid: null }
        : {
            status: 'paid',
            paidAt: paidAt ?? new Date(),
            valuePaid: valuePaid ?? existing.amount,
          }
    )
    .where(eq(transactionOccurrences.id, id))
    .returning()

  return { occurrence: updated }
}
