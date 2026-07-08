import * as XLSX from 'xlsx'

import { badRequest } from '@/core/errors'

import type { SheetRow } from './types'

const PT_MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  março: 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
}

const CARD_FINAL_PATTERN = /final\s+(\d{4})/i
const CARD_MASK_PATTERN = /\*{4}(\d{4})/

export function extractCardLastFour(value: string): string | null {
  const fromFinal = value.match(CARD_FINAL_PATTERN)?.[1]
  if (fromFinal) return fromFinal

  const fromMask = value.match(CARD_MASK_PATTERN)?.[1]
  return fromMask ?? null
}

const INVOICE_HEADER_PATTERN = /Fatura\s+(Paga|Aberta)\s*-\s*([A-Za-zÀ-ÿ]+)\s*\/\s*(\d{4})/i

export type ItauInvoiceKind = 'paid' | 'open'

export function parseInvoiceHeader(value: string): { monthKey: string; kind: ItauInvoiceKind } {
  const match = value.match(INVOICE_HEADER_PATTERN)
  if (!match) {
    throw badRequest('XLSX inválido: cabeçalho "Fatura Paga/Aberta - Mês/Ano" não encontrado')
  }

  const monthKey = match[2] as string
  const month = PT_MONTHS[monthKey.toLowerCase()]
  if (!month) {
    throw badRequest(`XLSX inválido: mês não reconhecido (${match[2]})`)
  }

  return {
    monthKey: `${match[3] as string}-${String(month).padStart(2, '0')}`,
    kind: (match[1] as string).toLowerCase() === 'paga' ? 'paid' : 'open',
  }
}

export function readSheetRows(buffer: Buffer): SheetRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    throw badRequest('XLSX inválido: planilha vazia')
  }

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw badRequest('XLSX inválido: planilha vazia')
  }

  return XLSX.utils.sheet_to_json<SheetRow[number]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  }) as SheetRow[]
}

export function findRowIndex(rows: SheetRow[], matcher: (row: SheetRow) => boolean): number {
  return rows.findIndex(matcher)
}
