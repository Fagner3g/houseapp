import { createHash } from 'node:crypto'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { badRequest } from '@/core/errors'

import type { ParsedLineTransaction } from './nubank-text-parser'
import type { ImportStatementBody } from './statement.schema'
import { assignStatementExternalIds } from './statement-transaction-external-id'

dayjs.extend(utc)

function clampDayInMonth(year: number, monthIndex: number, day: number): number {
  return Math.min(day, dayjs().year(year).month(monthIndex).daysInMonth())
}

export function getBillingCycle(closingDay: number, dueDay: number, monthKey: string) {
  const [yearStr, monthStr] = monthKey.split('-')
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1
  const anchor = dayjs.utc().year(year).month(monthIndex).startOf('month')

  const endDay = clampDayInMonth(year, monthIndex, closingDay)
  const periodEnd = anchor.date(endDay).endOf('day')

  const prev = anchor.subtract(1, 'month')
  const prevYear = prev.year()
  const prevMonthIndex = prev.month()
  const startDay = clampDayInMonth(prevYear, prevMonthIndex, closingDay)
  const periodStart = prev.date(startDay).add(1, 'day').startOf('day')

  const dueAnchor = dueDay > closingDay ? anchor : anchor.add(1, 'month')
  const dueDateDay = clampDayInMonth(dueAnchor.year(), dueAnchor.month(), dueDay)
  const dueDate = dueAnchor.date(dueDateDay)

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    closingDate: periodEnd.toISOString(),
    dueDate: dueDate.toISOString(),
  }
}

export function toIsoDateFromYmd(date: string): string {
  const [year, month, day] = date.split('-').map(part => Number.parseInt(part, 10))
  return new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0)).toISOString()
}

function parseCsvAmount(raw: string): { amount: string; isNegative: boolean } {
  const trimmed = raw.trim()
  const isNegative = /^[-−]\s*/.test(trimmed)
  const cleaned = trimmed
    .replace(/^[-−]\s*/, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const value = Number.parseFloat(cleaned)

  return {
    amount: Number.isNaN(value) ? '0.00' : Math.abs(value).toFixed(2),
    isNegative,
  }
}

function parseInstallment(title: string): { installmentNumber?: number; installmentsTotal?: number } {
  const match = title.match(/Parcela\s+(\d+)\/(\d+)/i)
  if (!match) return {}

  return {
    installmentNumber: Number.parseInt(match[1]!, 10),
    installmentsTotal: Number.parseInt(match[2]!, 10),
  }
}

function isIncomeLine(title: string, isNegative: boolean): boolean {
  if (isNegative) return true

  return /pagamento recebido|estorno|reversão|reversao|crédito de confiança|credito de confianca|iof de volta/i.test(
    title
  )
}

function parseCsvRow(line: string): { date: string; title: string; amount: string } | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const quotedAmountMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}),(.+),"([^"]*)"$/)
  if (quotedAmountMatch) {
    return {
      date: quotedAmountMatch[1]!,
      title: quotedAmountMatch[2]!.trim(),
      amount: quotedAmountMatch[3]!,
    }
  }

  const parts = trimmed.split(',')
  if (parts.length < 3) return null

  const date = parts[0]!
  const amount = parts[parts.length - 1]!.replace(/^"|"$/g, '')
  const title = parts.slice(1, -1).join(',').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !title) return null

  return { date, title, amount }
}

function parseTransactionsFromCsv(content: string): ParsedLineTransaction[] {
  const normalized = content.replace(/^\uFEFF/, '')
  const lines = normalized.split(/\r?\n/).filter(line => line.trim())

  if (lines.length < 2) {
    throw badRequest('CSV vazio ou sem transações')
  }

  const header = lines[0]!.toLowerCase().replace(/\s/g, '')
  if (!header.startsWith('date,title,amount')) {
    throw badRequest('CSV inválido: cabeçalho esperado date,title,amount')
  }

  const transactions: ParsedLineTransaction[] = []

  for (const line of lines.slice(1)) {
    const row = parseCsvRow(line)
    if (!row) continue

    const { amount, isNegative } = parseCsvAmount(row.amount)
    const isIncome = isIncomeLine(row.title, isNegative)

    transactions.push({
      title: row.title,
      amount,
      date: toIsoDateFromYmd(row.date),
      type: isIncome ? 'income' : 'expense',
      ...parseInstallment(row.title),
    })
  }

  if (transactions.length === 0) {
    throw badRequest('Nenhuma transação encontrada no CSV')
  }

  return transactions
}

function inferStatementDates(
  transactions: ParsedLineTransaction[],
  options?: { closingDay?: number | null; dueDay?: number | null }
) {
  const sortedDates = [...transactions].map(item => item.date).sort()
  const minDate = sortedDates[0]!
  const maxDate = sortedDates[sortedDates.length - 1]!
  const maxDayjs = dayjs(maxDate).utc()

  if (options?.closingDay && options?.dueDay) {
    const candidates = [
      getBillingCycle(options.closingDay, options.dueDay, maxDayjs.format('YYYY-MM')),
      getBillingCycle(
        options.closingDay,
        options.dueDay,
        maxDayjs.subtract(1, 'month').format('YYYY-MM')
      ),
      getBillingCycle(
        options.closingDay,
        options.dueDay,
        maxDayjs.add(1, 'month').format('YYYY-MM')
      ),
    ]

    const cycle =
      candidates.find(item => {
        const start = dayjs(item.periodStart).utc()
        const end = dayjs(item.periodEnd).utc()
        return !maxDayjs.isBefore(start) && !maxDayjs.isAfter(end)
      }) ?? candidates[0]!

    return {
      periodStart: cycle.periodStart,
      periodEnd: maxDayjs.toISOString(),
      closingDate: cycle.closingDate,
      dueDate: cycle.dueDate,
    }
  }

  return {
    periodStart: minDate,
    periodEnd: maxDate,
    closingDate: maxDate,
    dueDate: dayjs(maxDate).utc().add(7, 'day').toISOString(),
  }
}

export function parseNubankCsv(input: {
  content: string
  fileName: string
  closingDay?: number | null
  dueDay?: number | null
}): {
  parsed: ImportStatementBody
  transactionsCount: number
} {
  const fileHash = createHash('sha256').update(input.content).digest('hex')
  const transactions = assignStatementExternalIds(parseTransactionsFromCsv(input.content))
  const dates = inferStatementDates(transactions, {
    closingDay: input.closingDay,
    dueDay: input.dueDay,
  })

  const expensesTotal = transactions
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)

  const incomeTotal = transactions
    .filter(item => item.type === 'income')
    .reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)

  return {
    parsed: {
      fileHash,
      fileName: input.fileName,
      periodStart: dates.periodStart,
      periodEnd: dates.periodEnd,
      closingDate: dates.closingDate,
      dueDate: dates.dueDate,
      totalAmount: (expensesTotal - incomeTotal).toFixed(2),
      importSource: 'csv',
      isClosed: false,
      isPaid: false,
      transactions,
    },
    transactionsCount: transactions.length,
  }
}
