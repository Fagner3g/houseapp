import { and, eq, gte } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { addPeriod } from '../recurrence/utils'
import { resolveOccurrenceDescription } from './resolve-occurrence-description'

const HORIZON_MONTHS = 6

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function materializeOccurrences(
  seriesId: string,
  horizon = HORIZON_MONTHS,
  description?: string,
  trx: DbExecutor = db
) {
  const series = await trx
    .select()
    .from(transactionSeries)
    .where(eq(transactionSeries.id, seriesId))
    .limit(1)

  const rule = series[0]
  if (!rule) return

  const now = new Date()
  const horizonDate = new Date(now)
  horizonDate.setMonth(horizonDate.getMonth() + horizon)

  const existing = await trx
    .select({
      dueDate: transactionOccurrences.dueDate,
      description: transactionOccurrences.description,
    })
    .from(transactionOccurrences)
    .where(
      and(
        eq(transactionOccurrences.seriesId, seriesId),
        gte(transactionOccurrences.dueDate, rule.startDate)
      )
    )
    .orderBy(transactionOccurrences.dueDate)

  const existingSet = new Set(existing.map(o => +o.dueDate))
  const occurrenceDescription = resolveOccurrenceDescription(description, existing)

  let next: Date
  let index: number

  if (existing.length > 0) {
    index = existing.length + 1
    const last = existing[existing.length - 1].dueDate
    next = addPeriod(last, rule.recurrenceType, rule.recurrenceInterval ?? 1)
  } else {
    index = 1
    next = addPeriod(new Date(rule.startDate), rule.recurrenceType, rule.recurrenceInterval ?? 1)
  }

  const toInsert: (typeof transactionOccurrences.$inferInsert)[] = []

  while (next <= horizonDate) {
    if (rule.recurrenceUntil && next > rule.recurrenceUntil) break
    if (rule.installmentsTotal && index > rule.installmentsTotal) break
    if (!existingSet.has(+next)) {
      toInsert.push({
        seriesId: rule.id,
        dueDate: next,
        amount: rule.amount,
        installmentIndex: index,
        description: occurrenceDescription,
      })
    }
    next = addPeriod(next, rule.recurrenceType, rule.recurrenceInterval ?? 1)
    index++
  }

  if (toInsert.length > 0) {
    await trx.insert(transactionOccurrences).values(toInsert)
  }
}
