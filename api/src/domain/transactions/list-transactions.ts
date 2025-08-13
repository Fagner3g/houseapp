import dayjs from 'dayjs'
import { and, desc, eq, getTableColumns, gte, lte, sql } from 'drizzle-orm'

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
  dateFrom,
  dateTo,
  page = 1,
  perPage = 10,
}: ListTransactionsRequest) {
  const start = dateFrom ? dayjs(dateFrom).startOf('day') : dayjs().startOf('month')
  const end = dateTo ? dayjs(dateTo).endOf('day') : dayjs().endOf('month')

  const filters = [
    eq(transactions.ownerId, userId),
    eq(transactions.organizationId, orgId),
    gte(transactions.dueDate, start.toDate()),
    lte(transactions.dueDate, end.toDate()),
  ]

  if (type !== 'all') {
    filters.push(eq(transactions.type, type))
  }

  const offset = (page - 1) * perPage

  const baseQuery = db
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
          WHEN ${transactions.paidAt} IS NOT NULL OR ${transactions.dueDate}::date >= CURRENT_DATE THEN 0
          ELSE GREATEST(0, (CURRENT_DATE - ${transactions.dueDate}::date))
        END`,
    })
    .from(transactions)
    .innerJoin(users, eq(transactions.payToId, users.id))
    .where(and(...filters))

  const result = await baseQuery.orderBy(desc(transactions.dueDate)).limit(perPage).offset(offset)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(and(...filters))

  const totalItems = Number(count)
  const totalPages = Math.ceil(totalItems / perPage)
  const pagesRemaining = Math.max(0, totalPages - page)

  return {
    transactions: result,
    page,
    perPage,
    totalItems,
    totalPages,
    pagesRemaining,
  }
}
