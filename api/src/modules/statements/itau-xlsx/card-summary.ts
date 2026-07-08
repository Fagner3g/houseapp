import { badRequest } from '@/core/errors'

import { parseExcelDate } from './excel-dates'
import { extractCardLastFour } from './metadata'
import { parseAmount } from './rows'
import {
  findAmountColumnIndex,
  findCellIndex,
  normalizeCell,
  rowHasLabel,
  type SheetRow,
} from './types'

export function findCardSummaryHeaderIndex(rows: SheetRow[]): number {
  return rows.findIndex(
    row =>
      rowHasLabel(row, 'Cartão') &&
      findAmountColumnIndex(row) >= 0 &&
      rowHasLabel(row, 'Vencimento')
  )
}

export function parseCardSummary(rows: SheetRow[]) {
  const cardHeaderIndex = findCardSummaryHeaderIndex(rows)

  if (cardHeaderIndex < 0 || !rows[cardHeaderIndex + 1]) {
    throw badRequest('XLSX inválido: resumo do cartão não encontrado')
  }

  const cardHeader = rows[cardHeaderIndex] as SheetRow
  const cardRow = rows[cardHeaderIndex + 1] as SheetRow
  const cardColumn = findCellIndex(cardHeader, 'Cartão')
  const valueColumn = findAmountColumnIndex(cardHeader)
  const dueColumn = findCellIndex(cardHeader, 'Vencimento')

  const cardName = normalizeCell(cardRow[cardColumn])
  const cardLastFour = extractCardLastFour(cardName)
  const totalParsed = parseAmount(cardRow[valueColumn])

  if (!totalParsed) {
    throw badRequest('XLSX inválido: total da fatura não encontrado')
  }

  const dueDate = parseExcelDate(cardRow[dueColumn])
  if (!dueDate) {
    throw badRequest('XLSX inválido: vencimento não encontrado')
  }

  return { cardName, cardLastFour, totalParsed, dueDate }
}
