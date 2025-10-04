import { and, eq, lt, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'

export interface OverdueAlertTransaction {
  id: string
  seriesId: string
  title: string
  amountCents: number
  dueDate: Date
  overdueDays: number
  installmentIndex: number | null
  installmentsTotal: number | null
  organizationSlug: string
  payToId: string | null
  payToName: string | null
  payToPhone: string | null
}

/**
 * Fetch pending overdue transactions (dueDate < today) optionally filtered by org slug and user.
 */
export async function fetchOverdueTransactionsForAlerts(
  orgSlug: string,
  userId?: string,
  seriesId?: string
): Promise<OverdueAlertTransaction[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const rows = await db
    .select({
      id: transactionOccurrences.id,
      seriesId: transactionOccurrences.seriesId,
      title: transactionSeries.title,
      amount: transactionOccurrences.amount,
      dueDate: transactionOccurrences.dueDate,
      installmentIndex: transactionOccurrences.installmentIndex,
      installmentsTotal: transactionSeries.installmentsTotal,
      organizationSlug: sql<string>`org.slug`,
      payToId: transactionSeries.payToId,
      payToName: sql<string>`pay_to.name`,
      payToPhone: sql<string>`pay_to.phone`,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .leftJoin(sql`users as pay_to`, eq(transactionSeries.payToId, sql`pay_to.id`))
    .innerJoin(sql`organizations as org`, eq(transactionSeries.organizationId, sql`org.id`))
    .where(
      and(
        eq(sql`org.slug`, orgSlug),
        eq(transactionOccurrences.status, 'pending'),
        lt(transactionOccurrences.dueDate, today),
        userId
          ? or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
          : sql`true`,
        seriesId ? eq(transactionOccurrences.seriesId, seriesId) : sql`true`
      )
    )

  return rows.map(r => ({
    id: r.id,
    seriesId: r.seriesId,
    title: r.title,
    amountCents: Number(r.amount),
    dueDate: r.dueDate,
    overdueDays: Math.max(0, Math.ceil((+today - +r.dueDate) / (1000 * 60 * 60 * 24))),
    installmentIndex: r.installmentIndex ?? null,
    installmentsTotal: r.installmentsTotal ?? null,
    organizationSlug: r.organizationSlug,
    payToId: r.payToId ?? null,
    payToName: r.payToName ?? null,
    payToPhone: r.payToPhone ?? null,
  }))
}
