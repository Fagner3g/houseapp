import { and, eq, gte, lt, lte, or } from 'drizzle-orm'
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
  type: 'income' | 'expense'
  ownerId: string
  payToId: string
  ownerName: string | null
  ownerPhone: string | null
  payToName: string | null
  payToPhone: string | null
}

export async function runReports(ownerId: string) {
  const ownerUser = alias(users, 'owner')
  const payToUser = alias(users, 'pay_to')
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const rows = await db
    .select({
      id: transactionOccurrences.id,
      title: transactionSeries.title,
      amount: transactionOccurrences.amount,
      dueDate: transactionOccurrences.dueDate,
      paidAt: transactionOccurrences.paidAt,
      type: transactionSeries.type,
      ownerId: transactionSeries.ownerId,
      payToId: transactionSeries.payToId,
      ownerName: ownerUser.name,
      ownerPhone: ownerUser.phone,
      payToName: payToUser.name,
      payToPhone: payToUser.phone,
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

  const messages = generateReport(rows, ownerId)
  for (const { phone, message } of messages) {
    if (!phone) continue
    try {
      await sendWhatsAppMessage(phone, message)
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
    const type = isOwner ? (row.type === 'income' ? 'expense' : 'income') : row.type
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

    const valueNum = row.amount / 100
    const valueStr = fmtBRL.format(valueNum)
    const dueDate = new Date(row.dueDate)
    const dueDateStr = dueDate.toLocaleDateString('pt-BR')

    let status = '📄 Pendente'
    if (row.paidAt) {
      status = `✅ Pago`
    } else if (dueDate < now) {
      status = '❌ Vencida'
    } else if (dueDate <= fiveDaysFromNow) {
      status = '⏰ Prestes a vencer'
    }

    const line: Line = { name: row.title, valueNum, valueStr, dueDateStr, status }
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
    let message = `📩 *Relatório para ${client}*\n\n`
    if (receber.length > 0) {
      message += '🟢 *A Receber*\n\n'
      for (const item of receber) {
        message += `📄 *${item.name}*\n`
        message += `      • *Valor:* ${item.valueStr}\n`
        message += `      • *Vencimento:* ${item.dueDateStr}\n`
        message += `      • ${item.status}\n\n`
      }
      message += `💸 *Subtotal a receber:* ${fmtBRL.format(total.receber)}\n\n`
    }
    if (pagar.length > 0) {
      message += '🔴 *A Pagar*\n\n'
      for (const item of pagar) {
        message += `📄 *${item.name}*\n`
        message += `      • *Valor:* ${item.valueStr}\n`
        message += `      • *Vencimento:* ${item.dueDateStr}\n`
        message += `      • ${item.status}\n\n`
      }
      message += `✅ *Subtotal a pagar:* ${fmtBRL.format(total.pagar)}\n\n`
    }
    const saldo = total.receber - total.pagar
    message += '━━━━━━━━━━━━━━━━━━━━\n'
    message +=
      saldo >= 0
        ? `💵 *Saldo com ${client}:* ${fmtBRL.format(saldo)} a receber`
        : `💰 *Saldo com ${client}:* ${fmtBRL.format(Math.abs(saldo))} a pagar`
    reports.push({ phone, message })
  }
  return reports
}
