import { and, eq, gte, inArray, lte, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { tags as tagsTable } from '@/db/schemas/tags'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { transactionTags } from '@/db/schemas/transactionTags'
import { getContextualizedTransactionType } from '@/domain/transactions/get-contextualized-type'

export async function getTransactionReports(orgId: string, userId: string, referenceDate?: Date) {
  const now = referenceDate || new Date()
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
          eq(transactionSeries.ownerId, userId), // User is the owner
          eq(transactionSeries.payToId, userId) // User is responsible for the transaction
        ),
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
  let toReceiveTotal = 0
  let toSpendTotal = 0
  const toReceiveBy = new Map<string, number>()
  const toPayBy = new Map<string, number>()
  const toReceiveItems = new Map<string, { title: string; amount: number }[]>()
  const toPayItems = new Map<string, { title: string; amount: number }[]>()
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
    // para cálculos específicos abaixo, recalculamos o contraparte conforme a regra

    if (ctxType === 'income') {
      incomeRegistered += amountNum
      if (r.paidAt) receivedTotal += amountNum

      // Para meses históricos: considera tudo que tinha vencimento no mês (pago ou não)
      // Para mês atual: considera apenas o que está realmente pendente
      const isHistorical = endOfMonth < new Date()
      const shouldCountAsToReceive = isHistorical ? true : r.status === 'pending'

      if (shouldCountAsToReceive && !r.paidAt) {
        // Receber quando: tipo contextualizado é income e não foi pago
        toReceiveTotal += amountNum
        const counterparty =
          r.ownerId === userId ? r.payToName || r.payToEmail || 'Desconhecido' : r.ownerName
        toReceiveBy.set(counterparty, (toReceiveBy.get(counterparty) ?? 0) + amountNum)
        const arr = toReceiveItems.get(counterparty) ?? []
        arr.push({ title: r.title, amount: amountNum })
        toReceiveItems.set(counterparty, arr)
      }
      const d = incomeVsExpenseDailyMap.get(dateKey)
      if (d) d.income += amountNum
    } else {
      expenseRegistered += amountNum

      // Para meses históricos: considera tudo que tinha vencimento no mês (pago ou não)
      // Para mês atual: considera apenas o que está realmente pendente
      const isHistorical = endOfMonth < new Date()
      const shouldCountAsToPay = isHistorical ? true : r.status === 'pending'

      if (shouldCountAsToPay && !r.paidAt) {
        // Pagar quando: tipo contextualizado é expense e não foi pago
        toSpendTotal += amountNum
        const counterparty =
          r.payToId === userId ? r.ownerName : r.payToName || r.payToEmail || 'Desconhecido'
        toPayBy.set(counterparty, (toPayBy.get(counterparty) ?? 0) + amountNum)
        const arr = toPayItems.get(counterparty) ?? []
        arr.push({ title: r.title, amount: amountNum })
        toPayItems.set(counterparty, arr)
      }
      const d = incomeVsExpenseDailyMap.get(dateKey)
      if (d) d.expense += amountNum
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
    const d = dailyMap.get(k)
    if (d) {
      if (r.paidAt) d.paid += amountNum
      else d.pending += amountNum
      d.total += amountNum
    }
  }
  const dailyTransactions = Array.from(dailyMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, v]) => ({ date, ...v }))

  const monthlyTrend = [] as Array<{
    month: string
    total: number
    paid: number
    pending: number
  }>

  // Tags breakdown for current month - separated by income/expense
  const categoryBreakdown = [] as Array<{
    category: string
    count: number
    totalAmount: number
    color?: string
  }>
  const incomeByTag = [] as Array<{
    category: string
    count: number
    totalAmount: number
    color?: string
  }>
  const expenseByTag = [] as Array<{
    category: string
    count: number
    totalAmount: number
    color?: string
  }>

  if (rows.length > 0) {
    const seriesIds = Array.from(new Set(rows.map(r => r.seriesId)))
    const tagsRows = await db
      .select({
        seriesId: transactionTags.transactionId,
        tagName: tagsTable.name,
        tagColor: tagsTable.color,
      })
      .from(transactionTags)
      .innerJoin(tagsTable, eq(transactionTags.tagId, tagsTable.id))
      .where(inArray(transactionTags.transactionId, seriesIds as string[]))

    const tagTotals = new Map<string, { count: number; total: number; color?: string }>()
    const incomeTagTotals = new Map<string, { count: number; total: number; color?: string }>()
    const expenseTagTotals = new Map<string, { count: number; total: number; color?: string }>()

    // Map seriesId -> tag names
    const seriesIdToTags = new Map<string, { name: string; color?: string }[]>()
    for (const tr of tagsRows) {
      const list = seriesIdToTags.get(tr.seriesId) ?? []
      list.push({ name: tr.tagName, color: tr.tagColor })
      seriesIdToTags.set(tr.seriesId, list)
    }

    for (const r of rows) {
      const amountNum = Number(r.amount) / 100
      const tagItems = seriesIdToTags.get(r.seriesId) ?? []

      // Determinar se é receita ou despesa contextualizada
      const ctxType = getContextualizedTransactionType(
        r.type as 'income' | 'expense',
        r.ownerId,
        userId
      )

      for (const { name, color } of tagItems) {
        // Total geral (mantido para compatibilidade)
        const agg = tagTotals.get(name) ?? { count: 0, total: 0, color }
        if (agg.color === undefined && color) agg.color = color
        agg.count += 1
        agg.total += amountNum
        tagTotals.set(name, agg)

        // Separar por tipo
        if (ctxType === 'income') {
          const incomeAgg = incomeTagTotals.get(name) ?? { count: 0, total: 0, color }
          if (incomeAgg.color === undefined && color) incomeAgg.color = color
          incomeAgg.count += 1
          incomeAgg.total += amountNum
          incomeTagTotals.set(name, incomeAgg)
        } else {
          const expenseAgg = expenseTagTotals.get(name) ?? { count: 0, total: 0, color }
          if (expenseAgg.color === undefined && color) expenseAgg.color = color
          expenseAgg.count += 1
          expenseAgg.total += amountNum
          expenseTagTotals.set(name, expenseAgg)
        }
      }
    }

    // Montar array geral
    for (const [name, agg] of tagTotals.entries()) {
      categoryBreakdown.push({
        category: name,
        count: agg.count,
        totalAmount: agg.total,
        color: agg.color,
      })
    }
    categoryBreakdown.sort((a, b) => b.totalAmount - a.totalAmount)

    // Montar arrays separados
    for (const [name, agg] of incomeTagTotals.entries()) {
      incomeByTag.push({
        category: name,
        count: agg.count,
        totalAmount: agg.total,
        color: agg.color,
      })
    }
    incomeByTag.sort((a, b) => b.totalAmount - a.totalAmount)

    for (const [name, agg] of expenseTagTotals.entries()) {
      expenseByTag.push({
        category: name,
        count: agg.count,
        totalAmount: agg.total,
        color: agg.color,
      })
    }
    expenseByTag.sort((a, b) => b.totalAmount - a.totalAmount)
  }
  const statusDistribution = {
    paid: dailyTransactions.reduce((acc, d) => acc + d.paid, 0),
    pending: dailyTransactions.reduce((acc, d) => acc + d.pending, 0),
    // Para meses históricos, overdue são transações que venceram no mês e não foram pagas
    // Para mês atual, overdue são transações vencidas até hoje
    overdue: rows
      .filter(r => {
        if (r.status !== 'pending' && !r.paidAt) return false
        const isHistorical = endOfMonth < new Date()
        if (isHistorical) {
          // Mês passado: transações do mês que não foram pagas
          return !r.paidAt
        }
        // Mês atual: transações vencidas
        return r.status === 'pending' && r.dueDate < new Date()
      })
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
      chartData: {
        dailyTransactions,
        monthlyTrend,
        categoryBreakdown,
        incomeByTag,
        expenseByTag,
        statusDistribution,
      },
      // novos campos
      kpis: {
        totalMonth,
        incomeRegistered,
        expenseRegistered,
        receivedTotal,
        toReceiveTotal,
        toSpendTotal,
      },
      counterparties: {
        toReceive: Array.from(toReceiveBy.entries()).map(([name, amount]) => ({
          name,
          amount,
          items: (toReceiveItems.get(name) ?? []).slice(0, 5),
        })),
        toPay: Array.from(toPayBy.entries()).map(([name, amount]) => ({
          name,
          amount,
          items: (toPayItems.get(name) ?? []).slice(0, 5),
        })),
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
