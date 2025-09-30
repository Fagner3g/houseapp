import { and, eq, gte, lte, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { getContextualizedTransactionType } from '@/domain/transactions/get-contextualized-type'

export async function getTransactionReports(orgId: string, userId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  // Base rows for current month
  const rows = await db
    .select({
      id: transactionOccurrences.id,
      seriesId: transactionOccurrences.seriesId,
      title: transactionSeries.title,
      amount: transactionOccurrences.amount,
      status: transactionOccurrences.status,
      dueDate: transactionOccurrences.dueDate,
      paidAt: transactionOccurrences.paidAt,
      ownerId: transactionSeries.ownerId,
      payToId: transactionSeries.payToId,
      type: transactionSeries.type,
      ownerName: sql<string>`owner.name`,
      payToName: sql<string>`payto.name`,
      payToEmail: sql<string>`payto.email`,
      installmentsTotal: transactionSeries.installmentsTotal,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .innerJoin(sql`users as owner`, eq(transactionSeries.ownerId, sql`owner.id`))
    .innerJoin(sql`users as payto`, eq(transactionSeries.payToId, sql`payto.id`))
    .where(
      and(
        eq(transactionSeries.organizationId, orgId),
        or(
          and(
            gte(transactionOccurrences.dueDate, startOfMonth),
            lte(transactionOccurrences.dueDate, endOfMonth)
          ),
          and(
            eq(transactionOccurrences.status, 'pending'),
            lte(transactionOccurrences.dueDate, now)
          )
        )
      )
    )

  let totalMonth = 0
  let incomeRegistered = 0
  let expenseRegistered = 0
  let receivedTotal = 0
  let toSpendTotal = 0
  const incomeVsExpenseDailyMap = new Map<string, { income: number; expense: number }>()

  for (const r of rows) {
    const amountNum = Number(r.amount) / 100
    totalMonth += amountNum
    const dateKey = new Date(r.dueDate).toISOString().split('T')[0]
    if (!incomeVsExpenseDailyMap.has(dateKey))
      incomeVsExpenseDailyMap.set(dateKey, { income: 0, expense: 0 })

    const ctxType = getContextualizedTransactionType(
      r.type as 'income' | 'expense',
      r.ownerId,
      userId
    )
    if (ctxType === 'income') {
      incomeRegistered += amountNum
      if (r.paidAt) receivedTotal += amountNum
      const d = incomeVsExpenseDailyMap.get(dateKey)!
      d.income += amountNum
    } else {
      expenseRegistered += amountNum
      if (r.status === 'pending') toSpendTotal += amountNum
      const d = incomeVsExpenseDailyMap.get(dateKey)!
      d.expense += amountNum
    }
  }

  const incomeVsExpenseDaily = Array.from(incomeVsExpenseDailyMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, v]) => ({ date, income: v.income, expense: v.expense }))

  // monthly stats (counts)
  const monthlyStats = {
    totalTransactions: rows.length,
    totalAmount: rows.reduce((acc, r) => acc + Number(r.amount) / 100, 0),
    paidTransactions: rows.filter(r => r.paidAt).length,
    pendingTransactions: rows.filter(r => r.status === 'pending').length,
    overdueTransactions: rows.filter(r => r.status === 'pending' && r.dueDate < now).length,
  }

  // recent activity (last 10 by dueDate desc)
  const recentActivity = rows
    .slice()
    .sort((a, b) => +b.dueDate - +a.dueDate)
    .slice(0, 10)
    .map(r => ({
      id: r.id,
      title: r.title,
      amount: Number(r.amount) / 100,
      status: r.status as 'paid' | 'pending',
      dueDate: r.dueDate,
      ownerName: r.ownerName,
      updatedAt: r.paidAt ?? r.dueDate,
    }))

  // simple daily chart (paid/pending/total sums per day)
  const dailyMap = new Map<string, { paid: number; pending: number; total: number }>()
  for (const r of rows) {
    const k = new Date(r.dueDate).toISOString().split('T')[0]
    if (!dailyMap.has(k)) dailyMap.set(k, { paid: 0, pending: 0, total: 0 })
    const amountNum = Number(r.amount) / 100
    const d = dailyMap.get(k)!
    if (r.paidAt) d.paid += amountNum
    else d.pending += amountNum
    d.total += amountNum
  }
  const dailyTransactions = Array.from(dailyMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, v]) => ({ date, ...v }))

  const monthlyTrend = [] as Array<{ month: string; total: number; paid: number; pending: number }>
  const categoryBreakdown = [] as Array<{ category: string; count: number; totalAmount: number }>
  const statusDistribution = {
    paid: dailyTransactions.reduce((acc, d) => acc + d.paid, 0),
    pending: dailyTransactions.reduce((acc, d) => acc + d.pending, 0),
    overdue: rows
      .filter(r => r.status === 'pending' && r.dueDate < now)
      .reduce((acc, r) => acc + Number(r.amount) / 100, 0),
  }

  // Próximos 4 dias (alertas)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const fourDaysFromNow = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)
  fourDaysFromNow.setHours(23, 59, 59, 999)

  const upcomingRows = rows.filter(
    r => r.status === 'pending' && r.dueDate >= today && r.dueDate <= fourDaysFromNow
  )
  const upcomingSummary = {
    total: upcomingRows.length,
    today: upcomingRows.filter(r => sameDay(r.dueDate, today)).length,
    tomorrow: upcomingRows.filter(r => sameDay(r.dueDate, addDays(today, 1))).length,
    twoDays: upcomingRows.filter(r => sameDay(r.dueDate, addDays(today, 2))).length,
    threeToFourDays: upcomingRows.filter(
      r => sameDay(r.dueDate, addDays(today, 3)) || sameDay(r.dueDate, addDays(today, 4))
    ).length,
  }
  const upcomingTransactions = upcomingRows
    .slice()
    .sort((a, b) => +a.dueDate - +b.dueDate)
    .map(r => ({
      id: r.id,
      seriesId: r.seriesId,
      ownerId: r.ownerId,
      payToId: r.payToId,
      title: r.title,
      amount: Number(r.amount) / 100,
      dueDate: r.dueDate.toISOString(),
      ownerName: r.ownerName,
      payTo: r.payToEmail, // Enviar email em vez de nome
      payToName: r.payToName,
      payToEmail: r.payToEmail,
      installmentsTotal: r.installmentsTotal ?? null,
      daysUntilDue: Math.ceil((+r.dueDate - +today) / (1000 * 60 * 60 * 24)),
      alertType: 'warning' as 'warning',
    }))

  // Overdue list and summary
  const overdueList = rows
    .filter(r => r.status === 'pending' && r.dueDate < now)
    .map(r => ({
      id: r.id,
      title: r.title,
      amount: Number(r.amount) / 100,
      dueDate: r.dueDate.toISOString(),
      ownerName: r.ownerName,
      ownerId: r.ownerId,
      payToId: r.payToId,
      payTo: r.payToEmail, // Enviar email em vez de nome
      payToName: r.payToName,
      payToEmail: r.payToEmail,
      status: r.status as 'paid' | 'pending',
      overdueDays: Math.ceil((+now - +r.dueDate) / (1000 * 60 * 60 * 24)),
    }))

  // Paid this month list and summary
  const paidThisMonthList = rows
    .filter(r => !!r.paidAt && r.paidAt >= startOfMonth && r.paidAt <= endOfMonth)
    .map(r => ({
      id: r.id,
      title: r.title,
      amount: Number(r.amount) / 100,
      dueDate: r.dueDate.toISOString(),
      paidAt: r.paidAt?.toISOString() ?? null,
      ownerName: r.ownerName,
      ownerId: r.ownerId,
      payToId: r.payToId,
      payTo: r.payToEmail, // Enviar email em vez de nome
      payToName: r.payToName,
      payToEmail: r.payToEmail,
      status: r.status as 'paid' | 'pending',
    }))
  const paidThisMonthSummary = {
    total: paidThisMonthList.length,
    totalAmount: paidThisMonthList.reduce((acc, t) => acc + t.amount, 0),
  }

  return {
    reports: {
      upcomingAlerts: { transactions: upcomingTransactions, summary: upcomingSummary },
      monthlyStats,
      recentActivity,
      chartData: { dailyTransactions, monthlyTrend, categoryBreakdown, statusDistribution },
      // novos campos
      kpis: {
        totalMonth,
        incomeRegistered,
        expenseRegistered,
        receivedTotal,
        toSpendTotal,
      },
      incomeVsExpenseDaily,
      overdueTransactions: {
        summary: { total: overdueList.length },
        transactions: overdueList,
      },
      paidThisMonth: {
        summary: paidThisMonthSummary,
        transactions: paidThisMonthList,
      },
    },
    timestamp: new Date().toISOString(),
  }
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}
