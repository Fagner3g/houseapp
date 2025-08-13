import { and, desc, eq, getTableColumns, gte, lte, sql } from 'drizzle-orm'
import dayjs from 'dayjs'

import { db } from '@/db'
import { transactions } from '@/db/schemas/transactions'
import { users } from '@/db/schemas/users'

interface ListTransactionsRequest {
  userId: string
  orgId: string
  type?: 'all' | 'income' | 'expense'
  dateFrom?: Date
  dateTo?: Date
  page?: number
  perPage?: number
}

export async function listTransactionsService({
  userId,
  orgId,
  type = 'all',
  dateFrom = dayjs().startOf('month').toDate(),
  dateTo = dayjs().endOf('month').toDate(),
  page = 1,
  perPage = 10,
}: ListTransactionsRequest) {
  const offset = (page - 1) * perPage

  const conditions = [
    eq(transactions.ownerId, userId),
    eq(transactions.organizationId, orgId),
    gte(transactions.dueDate, dayjs(dateFrom).startOf('day').toDate()),
    lte(transactions.dueDate, dayjs(dateTo).endOf('day').toDate()),
  ]

  if (type !== 'all') {
    conditions.push(eq(transactions.type, type))
  }

  const where = and(...conditions)

  const totalItemsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(where)

  const totalItems = Number(totalItemsResult[0]?.count ?? 0)
  const totalPages = Math.ceil(totalItems / perPage)
  const pagesRemaining = Math.max(0, totalPages - page)

  const result = await db
    .select({
      ...getTableColumns(transactions),
      payTo: users.name,
      status: sql /*sql*/`
      CASE
        WHEN ${transactions.paidAt} IS NOT NULL THEN 'paid'
        WHEN ${transactions.paidAt} IS NULL AND ${transactions.dueDate}::date >= CURRENT_DATE THEN 'scheduled'
        ELSE 'overdue'
      END`,
      overdueDays: sql<number>`
      CASE
        WHEN ${transactions.paidAt} IS NULL AND ${transactions.dueDate}::date < CURRENT_DATE THEN
          GREATEST(0, DATE_PART('day', CURRENT_DATE - ${transactions.dueDate}::date))
        ELSE 0
      END`,
    })
    .from(transactions)
    .innerJoin(users, eq(transactions.payToId, users.id))
    .where(where)
    .orderBy(desc(transactions.dueDate))
    .limit(perPage)
    .offset(offset)

  return {
    transactions: result,
    page,
    perPage,
    totalItems,
    totalPages,
    pagesRemaining,
  }
}
