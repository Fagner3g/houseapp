import { and, eq, isNotNull } from 'drizzle-orm'
import dayjs from 'dayjs'

import { db } from '@/db'
import { accounts } from '@/db/schemas/accounts'

import type { ReportDateRange } from '../report.repository'
import { listInvoiceMySpendItems } from './invoice-items'
import { listOtherMySpendItems } from './other-expenses'
import type { MySpendBreakdown } from './types'

export async function computeMySpendBreakdown(
  organizationId: string,
  range: ReportDateRange,
  userId: string
): Promise<MySpendBreakdown> {
  const ccAccounts = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      closingDay: accounts.closingDay,
      dueDay: accounts.dueDay,
    })
    .from(accounts)
    .where(
      and(
        eq(accounts.organizationId, organizationId),
        eq(accounts.type, 'credit_card'),
        isNotNull(accounts.closingDay),
        isNotNull(accounts.dueDay)
      )
    )

  const creditCards = ccAccounts.map(account => ({
    id: account.id,
    name: account.name,
    closingDay: account.closingDay as number,
    dueDay: account.dueDay as number,
  }))

  const [invoiceItems, otherExpenses] = await Promise.all([
    listInvoiceMySpendItems(organizationId, range, userId, creditCards),
    listOtherMySpendItems(organizationId, userId, range),
  ])

  const items = [...invoiceItems, ...otherExpenses].sort(
    (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
  )

  const grossTotal = items.reduce((sum, item) => sum + item.grossAmount, 0n)
  const splitTotal = items.reduce((sum, item) => sum + item.splitAmount, 0n)
  const myTotal = items.reduce((sum, item) => sum + item.myAmount, 0n)

  return { items, grossTotal, splitTotal, myTotal }
}
