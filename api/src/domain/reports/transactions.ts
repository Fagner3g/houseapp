import { eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { db } from '@/db'
import { transactions } from '@/db/schemas/transactions'
import { users } from '@/db/schemas/users'
import { sendWhatsAppMessage } from '../whatsapp'

interface SimplifiedTransaction {
  client: string
  phone: string
  name: string
  value: number
  dueDate: Date
  paidAt: Date | null
  type: 'income' | 'expense'
  ownerId: string
  otherId: string
}

type Row = {
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

export function generateReport(rows: Row[], userId: string): { phone: string; message: string }[] {
  const now = new Date()
  const fiveDaysFromNow = new Date(now)
  fiveDaysFromNow.setDate(now.getDate() + 5)

  // Ignora contas de meses futuros
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999) // 23:59:59

  // Mapeia linhas para visão "do usuário" (inverte income/expense quando for dono)
  const simplified: SimplifiedTransaction[] = rows
    .map(row => {
      const isOwner = row.ownerId === userId
      const client = isOwner ? row.payToName : row.ownerName
      const phone = isOwner ? row.payToPhone : row.ownerPhone
      const type: 'income' | 'expense' = isOwner
        ? row.type === 'income'
          ? 'expense'
          : 'income'
        : row.type
      const otherId = isOwner ? row.payToId : row.ownerId

      return {
        client: client ?? 'Cliente',
        phone: phone ?? '',
        name: row.title,
        value: row.amount, // assume centavos
        dueDate: new Date(row.dueDate),
        paidAt: row.paidAt ? new Date(row.paidAt) : null,
        type,
        ownerId: row.ownerId,
        otherId,
      }
    })
    .filter(t => t.dueDate <= endOfMonth || (!t.paidAt && t.dueDate < now))

  // Agrupa por cliente (usando otherId como chave primária)
  type Bucket = {
    otherId: string
    client: string
    phone: string
    pagar: Array<{
      name: string
      valueNum: number
      valueStr: string
      dueDateStr: string
      status?: string
      dias?: number
    }>
    receber: Array<{
      name: string
      valueNum: number
      valueStr: string
      dueDateStr: string
      status?: string
      dias?: number
    }>
    total: { pagar: number; receber: number }
  }

  const grouped = new Map<string, Bucket>()
  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  for (const trx of simplified) {
    if (!grouped.has(trx.otherId)) {
      grouped.set(trx.otherId, {
        otherId: trx.otherId,
        client: trx.client,
        phone: trx.phone,
        pagar: [],
        receber: [],
        total: { pagar: 0, receber: 0 },
      })
    }

    const bucket = grouped.get(trx.otherId)!

    const dueDateStr = trx.dueDate.toLocaleDateString('pt-BR')
    const valueNum = trx.value / 100
    const valueStr = fmtBRL.format(valueNum)

    let status = '' as string | undefined
    let dias = 0 as number | undefined

    if (!trx.paidAt) {
      if (trx.dueDate < now) {
        status = '⚠️ Vencida'
        dias = Math.floor((+now - +trx.dueDate) / (1000 * 60 * 60 * 24))
      } else if (trx.dueDate <= fiveDaysFromNow) {
        status = '📅 Prestes a vencer'
        dias = Math.ceil((+trx.dueDate - +now) / (1000 * 60 * 60 * 24))
      }
    }

    const line = { name: trx.name, valueNum, valueStr, dueDateStr, status, dias }

    if (trx.type === 'expense') {
      bucket.pagar.push(line)
      if (!trx.paidAt) bucket.total.pagar += valueNum
    } else {
      bucket.receber.push(line)
      if (!trx.paidAt) bucket.total.receber += valueNum
    }
  }

  // Constrói mensagens no layout do exemplo
  const reports: { phone: string; message: string }[] = []

  for (const { client, phone, pagar, receber, total } of grouped.values()) {
    let message = `📩 *Relatório para ${client}*\n\n`
    // Se não houver telefone, não é possível enviar WhatsApp; pule este bucket
    if (!phone) {
      continue
    }

    if (receber.length > 0) {
      message += '━━━━━━━━━━━━━━━━━━━━\n'
      message += '🟢 *Contas a Receber*\n\n'
      for (const item of receber) {
        message += `🧾 *${item.name}*\n`
        message += `  • *Valor:* ${item.valueStr}\n`
        message += `  • *Vencimento:* ${item.dueDateStr}\n`
        if (item.status) message += `  • ${item.status} (${item.dias} dia(s))\n`
        message += '\n'
      }
      message += `💸 *Total a receber:* ${fmtBRL.format(total.receber)}\n\n`
    }

    if (pagar.length > 0) {
      message += '━━━━━━━━━━━━━━━━━━━━\n'
      message += '🔴 *Contas a Pagar*\n\n'
      for (const item of pagar) {
        message += `🧾 *${item.name}*\n`
        message += `  • *Valor:* ${item.valueStr}\n`
        message += `  • *Vencimento:* ${item.dueDateStr}\n`
        if (item.status) message += `  • ${item.status} (${item.dias} dia(s))\n`
        message += '\n'
      }
      message += `✅ *Total a pagar:* ${fmtBRL.format(total.pagar)}\n\n`
    }

    const saldo = total.receber - total.pagar
    message += '━━━━━━━━━━━━━━━━━━━━\n'
    message +=
      saldo >= 0
        ? `💵 *Você tem a receber:* ${fmtBRL.format(saldo)}`
        : `💰 *Você ainda deve:* ${fmtBRL.format(Math.abs(saldo))}`

    reports.push({ phone, message: message.trim() })
  }

  return reports
}

export async function fetchTransactions(): Promise<Row[]> {
  const owner = alias(users, 'owner')
  const payTo = alias(users, 'pay_to')

  const rows = await db
    .select({
      id: transactions.id,
      title: transactions.title,
      amount: transactions.amount,
      dueDate: transactions.dueDate,
      paidAt: transactions.paidAt,
      type: transactions.type,
      ownerId: transactions.ownerId,
      payToId: transactions.payToId,
      ownerName: owner.name,
      ownerPhone: owner.phone,
      payToName: payTo.name,
      payToPhone: payTo.phone,
    })
    .from(transactions)
    .leftJoin(owner, eq(transactions.ownerId, owner.id))
    .leftJoin(payTo, eq(transactions.payToId, payTo.id))

  return rows
}

export async function runReports(userId: string): Promise<void> {
  const rows = await fetchTransactions()
  const reports = generateReport(rows, userId)

  for (const { phone, message } of reports) {
    const result = await sendWhatsAppMessage({ phone, message })
    if (result.status === 'sent') {
      console.log(`Mensagem enviada para ${phone}`)
    } else {
      console.error(`Erro ao enviar mensagem para ${phone}: ${result.error}`)
    }
  }
}
