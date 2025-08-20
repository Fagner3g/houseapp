import { eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { db } from '@/db'
import { transactions } from '@/db/schemas/transactions'
import { users } from '@/db/schemas/users'

interface SimplifiedTransaction {
  client: string
  phone: string
  name: string
  value: number
  dueDate: Date
  paidAt: Date | null
  type: 'income' | 'expense'
  ownerId: string
}

export async function fetchTransactions(): Promise<any[]> {
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

export function generateReport(rows: any[], userId: string): { phone: string; message: string }[] {
  const today = new Date()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
  const upcomingLimit = new Date(today)
  upcomingLimit.setDate(today.getDate() + 5)

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
      return {
        client,
        phone,
        name: row.title,
        value: row.amount,
        dueDate: new Date(row.dueDate),
        paidAt: row.paidAt ? new Date(row.paidAt) : null,
        type,
        ownerId: row.ownerId,
      }
    })
    .filter(trx => trx.dueDate <= endOfMonth)

  const groups = new Map<string, { client: string; phone: string; transactions: SimplifiedTransaction[] }>()

  for (const trx of simplified) {
    const key = trx.phone
    if (!groups.has(key)) {
      groups.set(key, { client: trx.client, phone: trx.phone, transactions: [] })
    }
    groups.get(key)!.transactions.push(trx)
  }

  const reports: { phone: string; message: string }[] = []

  for (const { client, phone, transactions: trxList } of groups.values()) {
    let totalPay = 0
    let totalReceive = 0
    const overdueLines: string[] = []
    const upcomingLines: string[] = []

    for (const trx of trxList) {
      if (!trx.paidAt) {
        if (trx.type === 'expense') totalPay += trx.value
        else totalReceive += trx.value

        if (trx.dueDate < today) {
          overdueLines.push(`⚠️ ${trx.name} - ${(trx.value / 100).toFixed(2)} - ${trx.dueDate.toLocaleDateString()}`)
        } else if (trx.dueDate <= upcomingLimit) {
          upcomingLines.push(`📅 ${trx.name} - ${(trx.value / 100).toFixed(2)} - ${trx.dueDate.toLocaleDateString()}`)
        }
      }
    }

    let message = `Olá ${client}!\n`
    if (overdueLines.length) {
      message += `\nContas vencidas:\n${overdueLines.join('\n')}\n`
    }
    if (upcomingLines.length) {
      message += `\nContas a vencer:\n${upcomingLines.join('\n')}\n`
    }
    message += `\nTotal a pagar: ${(totalPay / 100).toFixed(2)}\nTotal a receber: ${(totalReceive / 100).toFixed(2)}`

    reports.push({ phone, message })
  }

  return reports
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<{ status: 'sent' | 'error'; error?: string }> {
  const BASE_URL = process.env.EVOLUTION_BASE_URL || 'https://evo.jarvis.dev.br'
  const INSTANCE = process.env.EVOLUTION_INSTANCE || 'JARVIS'
  const API_KEY = process.env.EVOLUTION_API_KEY
  const url = `${BASE_URL}/message/sendText/${INSTANCE}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: API_KEY ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number: phone, text: message }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { status: 'error', error: errorText }
    }

    return { status: 'sent' }
  } catch (err: any) {
    return { status: 'error', error: err.message }
  }
}

export async function runReports(userId: string): Promise<void> {
  const rows = await fetchTransactions()
  const reports = generateReport(rows, userId)

  for (const { phone, message } of reports) {
    const result = await sendWhatsAppMessage(phone, message)
    if (result.status === 'sent') {
      console.log(`Mensagem enviada para ${phone}`)
    } else {
      console.error(`Erro ao enviar mensagem para ${phone}: ${result.error}`)
    }
  }
}

