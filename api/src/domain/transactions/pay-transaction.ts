import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'

interface PayTransactionParams {
  id: string
  valuePaid?: number
}

export async function payTransactionService({ id, valuePaid }: PayTransactionParams) {
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
            paidAt: new Date(),
            valuePaid: valuePaid ?? existing.amount,
          }
    )
    .where(eq(transactionOccurrences.id, id))
    .returning()

  return { occurrence: updated }
}
