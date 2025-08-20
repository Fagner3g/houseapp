import { and, eq, gte, isNotNull, isNull, lt, lte, or } from 'drizzle-orm'
import { type ScheduledTask, schedule } from 'node-cron'

import { db } from '@/db'
import { transactions } from '@/db/schemas/transactions'
import { users } from '@/db/schemas/users'
import { normalizePhone, sendWhatsAppMessage } from '@/domain/whatsapp'
import { logger } from '@/http/utils/logger'

// ====================== helpers ======================
async function getDistinctOwnerIds(): Promise<string[]> {
  try {
    // SELECT DISTINCT owner_id FROM transactions WHERE owner_id IS NOT NULL
    const rows = await db
      .select({ ownerId: transactions.ownerId })
      .from(transactions)
      .where(isNotNull(transactions.ownerId))
      .groupBy(transactions.ownerId)

    return rows.map(r => r.ownerId!).filter(Boolean)
  } catch (err) {
    logger.error({ err }, '[owner-digest] erro ao obter owners distintos')
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
async function runOwnerDigestForAllOwners() {
  const ownerIds = await getDistinctOwnerIds()
  if (!ownerIds.length) {
    logger.warn('[owner-digest] nenhum ownerId encontrado, nada a processar')
    return
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
        logger.warn({ ownerId }, '[owner-digest] owner não encontrado — pulando')
        continue
      }

      const phone = normalizePhone(ownerRow.phone)
      if (!phone) {
        logger.warn({ ownerId }, '[owner-digest] owner sem telefone — pulando envio')
        continue
      }

      // Transações do owner (mês atual) OU (vencidas e não pagas)
      const rows = await db
        .select({
          title: transactions.title,
          amount: transactions.amount,
          dueDate: transactions.dueDate,
          paidAt: transactions.paidAt,
          type: transactions.type,
          payToName: users.name,
        })
        .from(transactions)
        .leftJoin(users, eq(users.id, transactions.payToId))
        .where(
          and(
            eq(transactions.ownerId, ownerId),
            or(
              and(gte(transactions.dueDate, startOfMonth), lte(transactions.dueDate, endOfMonth)),
              and(isNull(transactions.paidAt), lt(transactions.dueDate, now))
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
      await sendWhatsAppMessage({ phone, message })
      logger.info({ ownerRow: ownerRow.name }, '[owner-digest] mensagem enviada para o owner')
    } catch (err) {
      logger.error({ err, ownerId }, '[owner-digest] falha ao processar owner')
    }
  }
}

// ====================== schedule (singleton) ======================
const JOB_KEY_OWNER = 'reports:owner-digest'
const TZ = 'America/Sao_Paulo'

const g = globalThis as unknown as { __cronTasks?: Map<string, ScheduledTask> }
g.__cronTasks ??= new Map()

if (!g.__cronTasks.has(JOB_KEY_OWNER)) {
  const taskOwner = schedule(
    '0 10 5 * *', // dia 5 às 10:00
    async () => {
      try {
        logger.info('⏰ Cron disparado: owner digest (todos os owners)')
        await runOwnerDigestForAllOwners()
        logger.info('✅ Owner digest concluído')
      } catch (err) {
        logger.error({ err }, '❌ Erro no cron de owner digest')
      }
    },
    { timezone: TZ }
  )
  g.__cronTasks.set(JOB_KEY_OWNER, taskOwner)
  taskOwner.start()
  logger.info('📅 Cron (owner digest) agendado')
} else {
  logger.info({ JOB_KEY_OWNER }, 'Cron (owner digest) já estava agendado — evitando duplicar')
}

// Opcional: export para disparo manual
export async function runOwnerDigestNow() {
  await runOwnerDigestForAllOwners()
}
