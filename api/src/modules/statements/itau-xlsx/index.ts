import { createHash } from 'node:crypto'

import { badRequest } from '@/core/errors'

import { deriveImportedStatementSummary } from '../statement-invoice-summary'
import type { ImportStatementBody } from '../statement.schema'
import { assignStatementExternalIds } from '../statement-transaction-external-id'
import { parseCardSummary } from './card-summary'
import { parseInvoiceHeader, readSheetRows, type ItauInvoiceKind } from './metadata'
import { inferStatementDates, parseTransactions } from './rows'
import { findCellInRow, findCellIndex, findRowIndexWithCell, type SheetRow } from './types'

const INVOICE_HEADER_MATCHER = /Fatura\s+(Paga|Aberta)/i

export type ParseItauXlsxResult = {
  parsed: ImportStatementBody
  transactionsCount: number
  cardName: string
  cardLastFour: string | null
  invoiceKind: ItauInvoiceKind
}

export function parseItauXlsx(input: {
  buffer: Buffer
  fileName: string
  closingDay?: number | null
  dueDay?: number | null
}): ParseItauXlsxResult {
  const rows = readSheetRows(input.buffer)
  const invoiceHeaderIndex = findRowIndexWithCell(rows, value => INVOICE_HEADER_MATCHER.test(value))

  if (invoiceHeaderIndex < 0) {
    throw badRequest(
      'XLSX inválido: exportação do Itaú não reconhecida (esperado "Fatura Paga" ou "Fatura Aberta")'
    )
  }

  const invoiceHeader = findCellInRow(rows[invoiceHeaderIndex] as SheetRow, value =>
    INVOICE_HEADER_MATCHER.test(value)
  )
  if (!invoiceHeader) {
    throw badRequest(
      'XLSX inválido: exportação do Itaú não reconhecida (esperado "Fatura Paga" ou "Fatura Aberta")'
    )
  }

  const { monthKey, kind: invoiceKind } = parseInvoiceHeader(invoiceHeader)
  const { cardName, cardLastFour, totalParsed, dueDate } = parseCardSummary(rows)

  const launchesHeaderIndex = findRowIndexWithCell(rows, value => value === 'Lançamentos')
  if (launchesHeaderIndex < 0) {
    throw badRequest('XLSX inválido: seção "Lançamentos" não encontrada')
  }

  const columnHeader = rows[launchesHeaderIndex + 1]
  if (!columnHeader) {
    throw badRequest(
      'XLSX inválido: cabeçalho esperado Data | Lançamento | Parcelamento | Valor'
    )
  }

  const columns = {
    date: findCellIndex(columnHeader, 'Data'),
    title: findCellIndex(columnHeader, 'Lançamento'),
    installment: findCellIndex(columnHeader, 'Parcelamento'),
    amount: findCellIndex(columnHeader, 'Valor'),
    cardNumber: findCellIndex(columnHeader, 'Número do cartão'),
  }

  if (columns.date < 0 || columns.title < 0 || columns.installment < 0 || columns.amount < 0) {
    throw badRequest(
      'XLSX inválido: cabeçalho esperado Data | Lançamento | Parcelamento | Valor'
    )
  }

  const transactions = assignStatementExternalIds(
    parseTransactions(rows, launchesHeaderIndex + 2, columns, cardLastFour)
  )

  const dates = inferStatementDates({
    monthKey,
    dueDate,
    transactions,
    closingDay: input.closingDay,
    dueDay: input.dueDay,
  })

  const totalAmount = totalParsed.amount
  const fileHash = createHash('sha256').update(input.buffer).digest('hex')
  const isPaidInvoice = invoiceKind === 'paid'

  const summary = deriveImportedStatementSummary({
    totalAmount,
    periodStart: dates.periodStart,
    periodEnd: dates.periodEnd,
    dueDate: dates.dueDate,
    transactions,
    isClosed: isPaidInvoice,
  })

  return {
    parsed: {
      fileHash,
      fileName: input.fileName,
      periodStart: dates.periodStart,
      periodEnd: dates.periodEnd,
      closingDate: dates.closingDate,
      dueDate: dates.dueDate,
      totalAmount,
      previousBalance: summary.previousBalance,
      purchasesTotal: summary.purchasesTotal,
      paymentsReceived: summary.paymentsReceived,
      importSource: 'xlsx',
      isClosed: isPaidInvoice,
      isPaid: isPaidInvoice,
      transactions,
    },
    transactionsCount: transactions.length,
    cardName,
    cardLastFour,
    invoiceKind,
  }
}
