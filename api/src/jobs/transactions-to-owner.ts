import { and, eq, gte, isNotNull, lt, lte, or } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { users } from '@/db/schemas/users'
import { normalizePhone, sendWhatsAppMessage } from '@/domain/whatsapp'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'
import { addMessageFooter } from './utils/message-footer'

// ====================== helpers ======================
async function getDistinctOwnerIds(): Promise<string[]> {
  try {
    // SELECT DISTINCT owner_id FROM transaction_series WHERE owner_id IS NOT NULL
    const rows = await db
      .select({ ownerId: transactionSeries.ownerId })
      .from(transactionSeries)
      .where(isNotNull(transactionSeries.ownerId))
      .groupBy(transactionSeries.ownerId)

    return rows.map(r => r.ownerId!).filter(Boolean)
  } catch {
    return []
  }
}

// ====================== message builder ======================
async function generateOwnerDigestMessage(
  ownerName: string,
  rows: Array<{
    title: string
    amount: number
    dueDate: Date
    paidAt: Date | null
    type: 'income' | 'expense'
    payToName: string | null
  }>
): Promise<string> {
  const now = new Date()
  const fiveDaysFromNow = new Date(now)
  fiveDaysFromNow.setDate(now.getDate() + 5)
  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  type Line = {
    name: string
    valueNum: number
    valueStr: string
    dueDateStr: string
    status?: string
    dias?: number
  }
  type Bucket = {
    client: string
    pagar: Line[]
    receber: Line[]
    total: { pagar: number; receber: number }
  }

  const grouped = new Map<string, Bucket>()

  for (const r of rows) {
    const client = r.payToName ?? 'Cliente'
    if (!grouped.has(client)) {
      grouped.set(client, { client, pagar: [], receber: [], total: { pagar: 0, receber: 0 } })
    }
    const bucket = grouped.get(client)!

    const valueNum = r.amount / 100
    const valueStr = fmtBRL.format(valueNum)
    const dueDateStr = r.dueDate.toLocaleDateString('pt-BR')

    let status: string | undefined
    let dias: number | undefined
    if (!r.paidAt) {
      if (r.dueDate < now) {
        status = '❌ Vencida'
        dias = Math.floor((+now - +r.dueDate) / (1000 * 60 * 60 * 24))
      } else if (r.dueDate <= fiveDaysFromNow) {
        status = '⏰ Prestes a vencer'
        dias = Math.ceil((+r.dueDate - +now) / (1000 * 60 * 60 * 24))
      }
    }

    const line: Line = { name: r.title, valueNum, valueStr, dueDateStr, status, dias }
    if (r.type === 'expense') {
      bucket.pagar.push(line)
      if (!r.paidAt) bucket.total.pagar += valueNum
    } else {
      bucket.receber.push(line)
      if (!r.paidAt) bucket.total.receber += valueNum
    }
  }

  let message = `📩 *Relatório consolidado de ${ownerName}*\n\n`
  let sumPay = 0
  let sumReceive = 0

  for (const { client, pagar, receber, total } of grouped.values()) {
    // Cabeçalho único por contraparte
    message += '━━━━━━━━━━━━━━━━━━━━\n'
    message += `👤 *${client}*\n\n`

    if (receber.length > 0) {
      message += '🟢 *A Receber*\n\n'
      for (const item of receber) {
        message += `📄 *${item.name}*\n`
        message += `      • *Valor:* ${item.valueStr}\n`
        message += `      • *Vencimento:* ${item.dueDateStr}\n`
        if (item.status) message += `     • ${item.status} (${item.dias} dia(s))\n`
        message += '\n'
      }
      message += `💸 *Subtotal a receber:* ${fmtBRL.format(total.receber)}\n\n`
      sumReceive += total.receber
    }

    if (pagar.length > 0) {
      message += '🔴 *A Pagar*\n\n'
      for (const item of pagar) {
        message += `📄 *${item.name}*\n`
        message += `      • *Valor:* ${item.valueStr}\n`
        message += `      • *Vencimento:* ${item.dueDateStr}\n`
        if (item.status) message += `     • ${item.status} (${item.dias} dia(s))\n`
        message += '\n'
      }
      message += `✅ *Subtotal a pagar:* ${fmtBRL.format(total.pagar)}\n\n`
      sumPay += total.pagar
    }

    // Saldo por contraparte
    const saldoCliente = total.receber - total.pagar
    message +=
      saldoCliente >= 0
        ? `📈 *Saldo com ${client}:* ${fmtBRL.format(saldoCliente)} a receber\n\n`
        : `📉 *Saldo com ${client}:* ${fmtBRL.format(Math.abs(saldoCliente))} a pagar\n\n`
  }

  const saldo = sumReceive - sumPay
  message += '━━━━━━━━━━━━━━━━━━━━\n'
  message +=
    saldo >= 0
      ? `💵 *Saldo geral a receber:* ${fmtBRL.format(saldo)}`
      : `💰 *Saldo geral a pagar:* ${fmtBRL.format(Math.abs(saldo))}`

  return message.trim()
}

// ====================== runner ======================
async function runOwnerDigestForAllOwners(): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    const ownerIds = await getDistinctOwnerIds()
    if (!ownerIds.length) {
      return {
        success: true,
        processed: 0,
        errors: 0,
        duration: Date.now() - startTime,
      }
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    for (const ownerId of ownerIds) {
      try {
        // Owner (nome/telefone)
        const owner = await db
          .select({ id: users.id, name: users.name, phone: users.phone })
          .from(users)
          .where(eq(users.id, ownerId))
          .limit(1)

        const ownerRow = owner[0]
        if (!ownerRow) {
          continue // Skip owners not found
        }

        const phone = normalizePhone(ownerRow.phone)
        if (!phone) {
          continue // Skip owners without phone
        }

        // Transações do owner (mês atual) OU (vencidas e não pagas)
        const rows = await db
          .select({
            title: transactionSeries.title,
            amount: transactionOccurrences.amount,
            dueDate: transactionOccurrences.dueDate,
            paidAt: transactionOccurrences.paidAt,
            type: transactionSeries.type,
            payToName: users.name,
          })
          .from(transactionOccurrences)
          .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
          .leftJoin(users, eq(users.id, transactionSeries.payToId))
          .where(
            and(
              eq(transactionSeries.ownerId, ownerId),
              or(
                and(
                  gte(transactionOccurrences.dueDate, startOfMonth),
                  lte(transactionOccurrences.dueDate, endOfMonth)
                ),
                and(
                  eq(transactionOccurrences.status, 'pending'),
                  lt(transactionOccurrences.dueDate, now)
                )
              )
            )
          )

        const mapped = rows.map(r => ({
          title: r.title,
          amount: Number(r.amount),
          dueDate: new Date(r.dueDate as unknown as string),
          paidAt: r.paidAt ? new Date(r.paidAt as unknown as string) : null,
          type: r.type as 'income' | 'expense',
          payToName: r.payToName ?? null,
        }))

        const message = await generateOwnerDigestMessage(ownerRow.name ?? 'Você', mapped)
        await sendWhatsAppMessage({ phone, message: addMessageFooter(message) })
        processed++
      } catch {
        errors++
        // Log individual errors but continue processing
      }
    }

    return {
      success: errors === 0,
      processed,
      errors,
      duration: Date.now() - startTime,
    }
  } catch {
    return {
      success: false,
      processed,
      errors: errors + 1,
      duration: Date.now() - startTime,
    }
  }
}

// Registrar o job
jobManager.registerJob(JOB_CONFIGS.OWNER_DIGEST, runOwnerDigestForAllOwners)

// Export para execução manual
export async function runOwnerDigestNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.OWNER_DIGEST.key)
}
