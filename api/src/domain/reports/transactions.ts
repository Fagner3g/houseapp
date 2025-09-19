import { and, eq, gte, inArray, lt, lte, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { users } from '@/db/schemas/users'
import { logger } from '@/http/utils/logger'
import { sendWhatsAppMessage } from '../whatsapp'

export interface Row {
  id: string
  title: string
  amount: number
  dueDate: Date
  paidAt: Date | null
  description?: string | null
  type: 'income' | 'expense'
  ownerId: string
  payToId: string
  ownerName: string | null
  ownerPhone: string | null
  payToName: string | null
  payToPhone: string | null
  // recurrence (from series)
  seriesId?: string | null
  recurrenceType?: 'monthly' | 'weekly' | 'yearly' | null
  recurrenceInterval?: number | null
  installmentsTotal?: number | null
  // computed per series
  installmentsPaid?: number
  overdueUnpaid?: number
}

export async function runReports(ownerId: string) {
  const ownerUser = alias(users, 'owner')
  const payToUser = alias(users, 'pay_to')
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const rowsRaw = await db
    .select({
      id: transactionOccurrences.id,
      seriesId: transactionOccurrences.seriesId,
      title: transactionSeries.title,
      amount: transactionOccurrences.amount,
      dueDate: transactionOccurrences.dueDate,
      paidAt: transactionOccurrences.paidAt,
      description: transactionOccurrences.description,
      type: transactionSeries.type,
      ownerId: transactionSeries.ownerId,
      payToId: transactionSeries.payToId,
      ownerName: ownerUser.name,
      ownerPhone: ownerUser.phone,
      payToName: payToUser.name,
      payToPhone: payToUser.phone,
      recurrenceType: transactionSeries.recurrenceType,
      recurrenceInterval: transactionSeries.recurrenceInterval,
      installmentsTotal: transactionSeries.installmentsTotal,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .leftJoin(ownerUser, eq(ownerUser.id, transactionSeries.ownerId))
    .leftJoin(payToUser, eq(payToUser.id, transactionSeries.payToId))
    .where(
      and(
        eq(transactionSeries.ownerId, ownerId),
        or(
          and(
            gte(transactionOccurrences.dueDate, startOfMonth),
            lte(transactionOccurrences.dueDate, endOfMonth)
          ),
          and(eq(transactionOccurrences.status, 'pending'), lt(transactionOccurrences.dueDate, now))
        )
      )
    )

  const seriesIds = Array.from(new Set(rowsRaw.map(r => r.seriesId).filter(Boolean))) as string[]
  const aggregates: Record<string, { paid: number; overdueUnpaid: number }> = {}
  if (seriesIds.length) {
    const paidBySeries = await db
      .select({ seriesId: transactionOccurrences.seriesId, paid: sql<number>`count(*)` })
      .from(transactionOccurrences)
      .where(
        and(
          inArray(transactionOccurrences.seriesId, seriesIds),
          eq(transactionOccurrences.status, 'paid')
        )
      )
      .groupBy(transactionOccurrences.seriesId)

    const overdueBySeries = await db
      .select({ seriesId: transactionOccurrences.seriesId, overdueUnpaid: sql<number>`count(*)` })
      .from(transactionOccurrences)
      .where(
        and(
          inArray(transactionOccurrences.seriesId, seriesIds),
          eq(transactionOccurrences.status, 'pending'),
          lt(transactionOccurrences.dueDate, now)
        )
      )
      .groupBy(transactionOccurrences.seriesId)

    for (const id of seriesIds) aggregates[id] = { paid: 0, overdueUnpaid: 0 }
    for (const r of paidBySeries)
      aggregates[r.seriesId] = {
        ...(aggregates[r.seriesId] || { paid: 0, overdueUnpaid: 0 }),
        paid: Number(r.paid),
      }
    for (const r of overdueBySeries)
      aggregates[r.seriesId] = {
        ...(aggregates[r.seriesId] || { paid: 0, overdueUnpaid: 0 }),
        overdueUnpaid: Number(r.overdueUnpaid),
      }
  }

  const rows: Row[] = rowsRaw.map(r => ({
    ...r,
    // amount comes from DB as bigint -> coerce to number (cents)
    amount: Number(r.amount),
    installmentsPaid: r.seriesId ? (aggregates[r.seriesId]?.paid ?? 0) : 0,
    overdueUnpaid: r.seriesId ? (aggregates[r.seriesId]?.overdueUnpaid ?? 0) : 0,
  }))

  const messages = generateReport(rows, ownerId)
  for (const { phone, message } of messages) {
    if (!phone) continue
    try {
      await sendWhatsAppMessage({ phone, message })
    } catch (err) {
      logger.error({ err, phone }, 'failed to send report')
    }
  }
}

export function generateReport(rows: Row[], userId: string): { phone: string; message: string }[] {
  const now = new Date()
  const fiveDaysFromNow = new Date(now)
  fiveDaysFromNow.setDate(now.getDate() + 5)

  interface Line {
    name: string
    valueNum: number
    valueStr: string
    dueDateStr: string
    status: string
    icon: string
    description?: string | null
    recurrenceBlock?: string
  }

  type Bucket = {
    otherId: string
    client: string
    phone: string
    pagar: Line[]
    receber: Line[]
    total: { pagar: number; receber: number }
  }

  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const grouped = new Map<string, Bucket>()

  for (const row of rows) {
    const isOwner = row.ownerId === userId
    const client = isOwner ? (row.payToName ?? 'Cliente') : (row.ownerName ?? 'Cliente')
    const phone = isOwner ? (row.payToPhone ?? '') : (row.ownerPhone ?? '')
    // keep original type; do not invert (owner is always the series owner in this query)
    const type = row.type
    const otherId = isOwner ? row.payToId : row.ownerId

    if (!grouped.has(otherId)) {
      grouped.set(otherId, {
        otherId,
        client,
        phone,
        pagar: [],
        receber: [],
        total: { pagar: 0, receber: 0 },
      })
    }
    const bucket = grouped.get(otherId)!

    const valueNum = Number(row.amount) / 100
    const valueStr = fmtBRL.format(valueNum)
    const dueDate = new Date(row.dueDate)
    const dueDateStr = dueDate.toLocaleDateString('pt-BR')

    // status + icon
    let status = 'Pendente'
    let icon = '📄'
    const daysDiff = Math.ceil((+dueDate - +now) / (1000 * 60 * 60 * 24))
    if (row.paidAt) {
      status = 'Pago'
      icon = '✅'
    } else if (dueDate < now) {
      const atraso = Math.floor((+now - +dueDate) / (1000 * 60 * 60 * 24))
      status = `Vencida (${atraso} dia(s))`
      icon = '❌'
    } else if (daysDiff <= 5) {
      status = `Prestes a vencer (${daysDiff} dia(s))`
      icon = '⏰'
    }

    // recurrence details - only show if truly recurring (more than 1 installment)
    let recurrenceBlock: string | undefined
    if (row.recurrenceType && row.recurrenceInterval && (row.installmentsTotal ?? 0) > 1) {
      const indent = '      '
      const every =
        row.recurrenceType === 'monthly'
          ? `${row.recurrenceInterval} mês`
          : row.recurrenceType === 'weekly'
            ? `${row.recurrenceInterval} semana`
            : `${row.recurrenceInterval} ano`
      const paidCount = row.installmentsPaid ?? 0
      const total = row.installmentsTotal ?? null
      const remaining = total != null ? Math.max(0, total - paidCount) : null
      recurrenceBlock = `${indent}• \`Recorrente:\` a cada ${every}\n`
      recurrenceBlock += `${indent}• \`Parcelas pagas:\` ${paidCount}\n`
      if (total != null) {
        recurrenceBlock += `${indent}• \`Faltam pagar:\` ${remaining} de ${total}`
        if ((row.overdueUnpaid ?? 0) > 0) recurrenceBlock += ` (em atraso ${row.overdueUnpaid})`
        recurrenceBlock += `\n`
      }
    }

    const line: Line = {
      name: row.title,
      valueNum,
      valueStr,
      dueDateStr,
      status,
      icon,
      description: row.description,
      recurrenceBlock,
    }
    if (type === 'expense') {
      bucket.pagar.push(line)
      if (!row.paidAt) bucket.total.pagar += valueNum
    } else {
      bucket.receber.push(line)
      if (!row.paidAt) bucket.total.receber += valueNum
    }
  }

  const reports: { phone: string; message: string }[] = []
  for (const { client, phone, pagar, receber, total } of grouped.values()) {
    // 1. Mensagem de saudação e resumo
    const currentDate = new Date().toLocaleDateString('pt-BR')
    let summaryMessage = `📩 *Relatório para ${client}*\n`
    summaryMessage += `📅 *Data:* ${currentDate}\n\n`

    if (receber.length > 0) {
      summaryMessage += `🟢 *Contas a Receber:* ${receber.length} transação(ões)\n`
      summaryMessage += `🪙 *Total a receber:* ${fmtBRL.format(total.receber)}\n\n`
    }

    if (pagar.length > 0) {
      summaryMessage += `🔴 *Contas a Pagar:* ${pagar.length} transação(ões)\n`
      summaryMessage += `🪙 *Total a pagar:* ${fmtBRL.format(total.pagar)}\n\n`
    }

    const saldo = total.receber - total.pagar
    summaryMessage += '━━━━━━━━━━━━━━━━━━━━\n'
    summaryMessage +=
      saldo >= 0
        ? `💵 *Saldo com ${client}:* ${fmtBRL.format(saldo)} a receber`
        : `💰 *Saldo com ${client}:* ${fmtBRL.format(Math.abs(saldo))} a pagar`

    reports.push({ phone, message: summaryMessage })

    // 2. Mensagens individuais para cada transação a receber
    for (const item of receber) {
      let transactionMessage = `🟢 *Conta a Receber*\n\n`
      transactionMessage += `${item.icon} *${item.name}*\n`
      transactionMessage += `      • \`Valor:\` ${item.valueStr}\n`
      transactionMessage += `      • \`Vencimento:\` ${item.dueDateStr}\n`
      transactionMessage += `      • \`Status:\` ${item.status}\n`
      if (item.recurrenceBlock) transactionMessage += item.recurrenceBlock
      if (item.description) transactionMessage += `      • \`Descrição:\` ${item.description}\n`

      reports.push({ phone, message: transactionMessage })
    }

    // 3. Mensagens individuais para cada transação a pagar
    for (const item of pagar) {
      let transactionMessage = `🔴 *Conta a Pagar*\n\n`
      transactionMessage += `${item.icon} *${item.name}*\n`
      transactionMessage += `      • \`Valor:\` ${item.valueStr}\n`
      transactionMessage += `      • \`Vencimento:\` ${item.dueDateStr}\n`
      transactionMessage += `      • \`Status:\` ${item.status}\n`
      if (item.recurrenceBlock) transactionMessage += item.recurrenceBlock
      if (item.description) transactionMessage += `      • \`Descrição:\` ${item.description}\n`

      reports.push({ phone, message: transactionMessage })
    }
  }
  return reports
}
