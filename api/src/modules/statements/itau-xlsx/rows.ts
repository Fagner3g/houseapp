import { getBillingCycle } from '@/core/billing-cycle'
import { badRequest } from '@/core/errors'

import type { ParsedLineTransaction } from '../statement-parser-types'
import { toIsoDateFromYmd } from '../statement-parser-types'
import { parseExcelDate } from './excel-dates'
import { extractCardLastFour } from './metadata'
import { normalizeCell, type SheetRow, type TransactionColumnMap } from './types'

const INSTALLMENT_PATTERN = /Parcela\s+(\d+)\s+de\s+(\d+)/i

export function parseAmount(value: unknown): { amount: string; isNegative: boolean } | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return {
      amount: Math.abs(value).toFixed(2),
      isNegative: value < 0,
    }
  }

  const raw = normalizeCell(value)
  if (!raw) return null

  const isNegative = raw.startsWith('-')
  const cleaned = raw.replace(/^-/, '').replace(/\./g, '').replace(',', '.')
  const parsed = Number.parseFloat(cleaned)

  if (Number.isNaN(parsed)) return null

  return {
    amount: Math.abs(parsed).toFixed(2),
    isNegative,
  }
}

function parseInstallment(value: string): { installmentNumber?: number; installmentsTotal?: number } {
  const match = value.match(INSTALLMENT_PATTERN)
  if (!match) return {}

  return {
    installmentNumber: Number.parseInt(match[1] as string, 10),
    installmentsTotal: Number.parseInt(match[2] as string, 10),
  }
}

function rowContainsSubtotal(row: SheetRow): boolean {
  return row.some(cell => /^Subtotal/i.test(normalizeCell(cell)))
}

export function parseTransactions(
  rows: SheetRow[],
  startIndex: number,
  columns: TransactionColumnMap,
  statementCardLastFour?: string | null
): ParsedLineTransaction[] {
  const transactions: ParsedLineTransaction[] = []

  for (let index = startIndex; index < rows.length; index++) {
    const row = rows[index] as SheetRow

    if (rowContainsSubtotal(row)) break

    const date = parseExcelDate(row[columns.date])
    const title = normalizeCell(row[columns.title])
    const parcelamento = normalizeCell(row[columns.installment])
    const parsedAmount = parseAmount(row[columns.amount])

    if (!date || !title || !parsedAmount) continue

    const rowCardLastFour =
      columns.cardNumber >= 0
        ? extractCardLastFour(normalizeCell(row[columns.cardNumber] ?? ''))
        : null
    const cardLastFour =
      rowCardLastFour && rowCardLastFour === statementCardLastFour ? rowCardLastFour : null

    transactions.push({
      title,
      amount: parsedAmount.amount,
      date,
      type: parsedAmount.isNegative ? 'income' : 'expense',
      ...parseInstallment(parcelamento),
      ...(cardLastFour ? { cardLastFour } : {}),
    })
  }

  if (transactions.length === 0) {
    throw badRequest('Nenhuma transação encontrada no XLSX')
  }

  return transactions
}

export function inferStatementDates(input: {
  monthKey: string
  dueDate: string
  transactions: ParsedLineTransaction[]
  closingDay?: number | null
  dueDay?: number | null
}) {
  if (input.closingDay && input.dueDay) {
    const cycle = getBillingCycle(input.closingDay, input.dueDay, input.monthKey)
    return {
      periodStart: toIsoDateFromYmd(cycle.periodStart),
      periodEnd: toIsoDateFromYmd(cycle.periodEnd),
      closingDate: toIsoDateFromYmd(cycle.closingDate),
      dueDate: input.dueDate,
    }
  }

  const sortedDates = [...input.transactions].map(item => item.date).sort()
  const periodStart = sortedDates[0] as string
  const periodEnd = sortedDates[sortedDates.length - 1] as string

  return {
    periodStart,
    periodEnd,
    closingDate: periodEnd,
    dueDate: input.dueDate,
  }
}
