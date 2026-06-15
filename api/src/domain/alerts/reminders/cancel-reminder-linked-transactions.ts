import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { reminderOccurrenceTransactions } from '@/db/schemas/reminderOccurrenceTransactions'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { BadRequestError } from '@/http/utils/error'

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

interface CancelReminderLinkedTransactionsOptions {
  periodKey?: string
  blockIfPaid?: boolean
  trx?: DbExecutor
}

export async function cancelReminderLinkedTransactions(
  reminderId: string,
  { periodKey, blockIfPaid = false, trx = db }: CancelReminderLinkedTransactionsOptions = {}
) {
  const conditions = [eq(reminderOccurrenceTransactions.reminderId, reminderId)]
  if (periodKey) {
    conditions.push(eq(reminderOccurrenceTransactions.periodKey, periodKey))
  }

  const links = await trx
    .select()
    .from(reminderOccurrenceTransactions)
    .where(and(...conditions))

  const now = new Date()
  const canceledOccurrenceIds: string[] = []

  for (const link of links) {
    const [occurrence] = await trx
      .select({ status: transactionOccurrences.status })
      .from(transactionOccurrences)
      .where(eq(transactionOccurrences.id, link.occurrenceId))
      .limit(1)

    if (occurrence?.status === 'paid' || occurrence?.status === 'partial') {
      if (blockIfPaid) {
        throw new BadRequestError(
          'Não é possível desmarcar o lembrete pois a transação vinculada já foi paga ou possui pagamento parcial'
        )
      }
      continue
    }

    if (occurrence && occurrence.status !== 'canceled') {
      await trx
        .update(transactionOccurrences)
        .set({ status: 'canceled', updatedAt: now })
        .where(eq(transactionOccurrences.id, link.occurrenceId))

      await trx
        .update(transactionSeries)
        .set({ active: false, updatedAt: now })
        .where(eq(transactionSeries.id, link.seriesId))

      canceledOccurrenceIds.push(link.occurrenceId)
    }

    await trx
      .delete(reminderOccurrenceTransactions)
      .where(eq(reminderOccurrenceTransactions.id, link.id))
  }

  return { canceledOccurrenceIds }
}
