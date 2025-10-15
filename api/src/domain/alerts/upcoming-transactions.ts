import { and, eq, gte, inArray, lte, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { userOrganizations } from '@/db/schemas/userOrganization'

export type AlertTransaction = {
  id: string
  seriesId: string
  title: string
  amountCents: number
  dueDate: Date
  status: 'paid' | 'pending'
  installmentIndex: number | null
  installmentsTotal: number | null
  organizationSlug: string
  ownerId: string
  ownerName: string | null
  ownerPhone: string | null
  payToId: string | null
  payToName: string | null
  payToPhone: string | null
  notificationsEnabled: boolean
}

/**
 * Fetch pending transactions that are due between today and 4 days from now.
 * Optionally filter by a specific user (owner or payTo).
 */
export async function fetchUpcomingTransactionsForAlerts(
  orgIds: string | string[],
  userId?: string
): Promise<AlertTransaction[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fourDaysFromNow = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)
  fourDaysFromNow.setHours(23, 59, 59, 999)

  const rows = await db
    .select({
      id: transactionOccurrences.id,
      seriesId: transactionOccurrences.seriesId,
      title: transactionSeries.title,
      amount: transactionOccurrences.amount,
      dueDate: transactionOccurrences.dueDate,
      status: transactionOccurrences.status,
      installmentIndex: transactionOccurrences.installmentIndex,
      installmentsTotal: transactionSeries.installmentsTotal,
      organizationSlug: sql<string>`org.slug`,
      ownerId: transactionSeries.ownerId,
      ownerName: sql<string>`owner.name`,
      ownerPhone: sql<string>`owner.phone`,
      payToId: transactionSeries.payToId,
      payToName: sql<string>`pay_to.name`,
      payToPhone: sql<string>`pay_to.phone`,
      notificationsEnabled: userOrganizations.notificationsEnabled,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .innerJoin(sql`users as owner`, eq(transactionSeries.ownerId, sql`owner.id`))
    .leftJoin(sql`users as pay_to`, eq(transactionSeries.payToId, sql`pay_to.id`))
    .innerJoin(sql`organizations as org`, eq(transactionSeries.organizationId, sql`org.id`))
    .innerJoin(
      userOrganizations,
      and(
        eq(userOrganizations.organizationId, sql`org.id`),
        or(
          eq(userOrganizations.userId, transactionSeries.ownerId),
          eq(userOrganizations.userId, transactionSeries.payToId)
        )
      )
    )
    .where(
      and(
        Array.isArray(orgIds)
          ? orgIds.length > 0
            ? inArray(transactionSeries.organizationId, orgIds)
            : sql`true`
          : eq(transactionSeries.organizationId, orgIds),
        eq(transactionOccurrences.status, 'pending'),
        gte(transactionOccurrences.dueDate, today),
        lte(transactionOccurrences.dueDate, fourDaysFromNow),
        eq(userOrganizations.notificationsEnabled, true), // Só usuários com notificações habilitadas
        userId
          ? or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
          : sql`true`
      )
    )

  return rows.map(r => ({
    id: r.id,
    seriesId: r.seriesId,
    title: r.title,
    amountCents: Number(r.amount),
    dueDate: r.dueDate,
    status: r.status as 'paid' | 'pending',
    installmentIndex: r.installmentIndex ?? null,
    installmentsTotal: r.installmentsTotal ?? null,
    organizationSlug: r.organizationSlug,
    ownerId: r.ownerId,
    ownerName: r.ownerName ?? null,
    ownerPhone: r.ownerPhone ?? null,
    payToId: r.payToId ?? null,
    payToName: r.payToName ?? null,
    payToPhone: r.payToPhone ?? null,
    notificationsEnabled: r.notificationsEnabled,
  }))
}
