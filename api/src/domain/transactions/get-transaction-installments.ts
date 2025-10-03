import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'

interface GetTransactionInstallmentsRequest {
  serieId: string
}

export async function getTransactionInstallments({ serieId }: GetTransactionInstallmentsRequest) {
  const installments = await db
    .select({
      id: transactionOccurrences.id,
      installmentIndex: transactionOccurrences.installmentIndex,
      dueDate: transactionOccurrences.dueDate,
      amount: transactionOccurrences.amount,
      status: transactionOccurrences.status,
      paidAt: transactionOccurrences.paidAt,
      valuePaid: transactionOccurrences.valuePaid,
      description: transactionOccurrences.description,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .where(eq(transactionOccurrences.seriesId, serieId))
    .orderBy(transactionOccurrences.installmentIndex)

  return { installments }
}
