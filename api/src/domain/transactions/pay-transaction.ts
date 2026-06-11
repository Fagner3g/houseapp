import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'

import { deactivateSeriesIfComplete } from './deactivate-series-if-complete'

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

  const now = paidAt ?? new Date()
  const amount = Number(existing.amount)
  const status = existing.status

  if (status === 'paid') {
    const [updated] = await db
      .update(transactionOccurrences)
      .set({ status: 'pending', paidAt: null, valuePaid: null })
      .where(eq(transactionOccurrences.id, id))
      .returning()
    return { occurrence: updated }
  }

  if (status === 'partial') {
    const previousPaid = Number(existing.valuePaid ?? 0)
    const additional = valuePaid !== undefined ? Number(valuePaid) : amount - previousPaid
    const totalPaid = previousPaid + additional
    const newStatus = totalPaid >= amount ? 'paid' : 'partial'

    const [updated] = await db
      .update(transactionOccurrences)
      .set({
        status: newStatus,
        paidAt: now,
        valuePaid: totalPaid,
      })
      .where(eq(transactionOccurrences.id, id))
      .returning()

    if (updated && newStatus === 'paid') {
      await deactivateSeriesIfComplete(updated.seriesId)
    }

    return { occurrence: updated }
  }

  if (status === 'canceled') {
    return { occurrence: existing }
  }

  const paidAmount = valuePaid !== undefined ? Number(valuePaid) : amount
  const newStatus = paidAmount >= amount ? 'paid' : 'partial'

  const [updated] = await db
    .update(transactionOccurrences)
    .set({
      status: newStatus,
      paidAt: now,
      valuePaid: paidAmount,
    })
    .where(eq(transactionOccurrences.id, id))
    .returning()

  if (updated && newStatus === 'paid') {
    await deactivateSeriesIfComplete(updated.seriesId)
  }

  return { occurrence: updated }
}
