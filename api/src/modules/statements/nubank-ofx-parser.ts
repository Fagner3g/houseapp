import { createHash } from 'node:crypto'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { badRequest } from '@/core/errors'

import { getBillingCycle } from '@/core/billing-cycle'

import type { ParsedLineTransaction } from './statement-parser-types'
import { toIsoDateFromYmd } from './statement-parser-types'
import type { ImportStatementBody } from './statement.schema'
import { isBillingCycleClosed, suggestPaidFromStatement } from './invoice-status'
import { deriveImportedStatementSummary } from './statement-invoice-summary'

dayjs.extend(utc)

const NUBANK_ORG = 'NU PAGAMENTOS S.A.'

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'))
  return match?.[1]?.trim() ?? null
}

function extractStmtTrnBlocks(content: string): string[] {
  const blocks: string[] = []
  const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match: RegExpExecArray | null

  for (;;) {
    match = regex.exec(content)
    if (match === null) break
    blocks.push(match[1] as string)
  }

  return blocks
}

function parseOfxDate(raw: string): string {
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!match) {
    throw badRequest(`Data OFX inválida: ${raw}`)
  }

  return toIsoDateFromYmd(`${match[1]}-${match[2]}-${match[3]}`)
}

function parseOfxAmount(raw: string): { amount: string; isNegative: boolean } {
  const value = Number.parseFloat(raw.trim())

  return {
    amount: Number.isNaN(value) ? '0.00' : Math.abs(value).toFixed(2),
    isNegative: value < 0,
  }
}

function parseInstallment(title: string): { installmentNumber?: number; installmentsTotal?: number } {
  const match = title.match(/Parcela\s+(\d+)\/(\d+)/i)
  if (!match) return {}

  return {
    installmentNumber: Number.parseInt(match[1] as string, 10),
    installmentsTotal: Number.parseInt(match[2] as string, 10),
  }
}

function isIncomeTransaction(trnType: string, memo: string): boolean {
  if (trnType.toUpperCase() === 'CREDIT') return true

  return /pagamento recebido|estorno|reversão|reversao|crédito de confiança|credito de confianca|iof de volta/i.test(
    memo
  )
}

function buildOfxExternalId(fitId: string, memo: string, amount: string, date: string): string {
  return createHash('sha256').update(`${fitId}|${memo}|${amount}|${date}`).digest('hex')
}

function extractDueDateFromFileName(fileName: string): string | null {
  const match = fileName.match(/Nubank_(\d{4}-\d{2}-\d{2})(?:[^.]*)?\.ofx/i)
  if (!match) return null

  return toIsoDateFromYmd(match[1] as string)
}

function extractDayFromOfxDateTag(raw: string): number {
  return new Date(parseOfxDate(raw)).getUTCDate()
}

/** DTEND marks the statement period end, which is the card closing date in Nubank OFX. */
function extractClosingDayFromOfx(dtEnd: string, dtAsOf: string | null): number {
  if (dtEnd) return extractDayFromOfxDateTag(dtEnd)
  if (dtAsOf) return extractDayFromOfxDateTag(dtAsOf)
  throw badRequest('OFX inválido: faltam DTEND ou DTASOF para inferir o fechamento')
}

/** Nubank encodes the invoice due date in the export filename (Nubank_YYYY-MM-DD.ofx). */
function extractDueDayFromFileName(fileName: string): number | null {
  const dueDate = extractDueDateFromFileName(fileName)
  if (!dueDate) return null

  return new Date(dueDate).getUTCDate()
}

function inferDueDate(
  dtEnd: string,
  fileName: string,
  options?: { closingDay?: number | null; dueDay?: number | null }
): string {
  const fromFile = extractDueDateFromFileName(fileName)
  if (fromFile) return fromFile

  const periodEnd = parseOfxDate(dtEnd)

  if (options?.closingDay && options?.dueDay) {
    const monthKey = dayjs(periodEnd).utc().format('YYYY-MM')
    const cycle = getBillingCycle(options.closingDay, options.dueDay, monthKey)
    return cycle.dueDate
  }

  return dayjs(periodEnd).utc().add(7, 'day').toISOString()
}

function parseTransactionsFromOfx(content: string): ParsedLineTransaction[] {
  const blocks = extractStmtTrnBlocks(content)

  if (blocks.length === 0) {
    throw badRequest('Nenhuma transação encontrada no OFX')
  }

  const transactions: ParsedLineTransaction[] = []

  for (const block of blocks) {
    const trnType = extractTag(block, 'TRNTYPE')
    const dtPosted = extractTag(block, 'DTPOSTED')
    const trnAmt = extractTag(block, 'TRNAMT')
    const fitId = extractTag(block, 'FITID')
    const memo = extractTag(block, 'MEMO')

    if (!trnType || !dtPosted || !trnAmt || !fitId || !memo) continue

    const date = parseOfxDate(dtPosted)
    const { amount } = parseOfxAmount(trnAmt)
    const isIncome = isIncomeTransaction(trnType, memo)

    transactions.push({
      title: memo,
      amount,
      date,
      type: isIncome ? 'income' : 'expense',
      externalId: buildOfxExternalId(fitId, memo, amount, date),
      ...parseInstallment(memo),
    })
  }

  if (transactions.length === 0) {
    throw badRequest('Nenhuma transação encontrada no OFX')
  }

  return transactions
}

export type SuggestedCreditCardAccount = {
  name: string
  institution: string
  currency: string
  closingDay: number
  dueDay: number | null
  creditLimit?: string | null
}

function extractCreditLimitFromOfx(content: string): string | null {
  const creditLimBlock = content.match(/<CREDITLIM>([\s\S]*?)<\/CREDITLIM>/i)?.[1]
  if (creditLimBlock) {
    const nestedBalAmt = extractTag(creditLimBlock, 'BALAMT')
    if (nestedBalAmt) {
      const value = Math.abs(Number.parseFloat(nestedBalAmt))
      if (!Number.isNaN(value) && value > 0) return value.toFixed(2)
    }

    const direct = creditLimBlock.trim()
    const value = Math.abs(Number.parseFloat(direct))
    if (!Number.isNaN(value) && value > 0) return value.toFixed(2)
  }

  const directTag = extractTag(content, 'CREDITLIM')
  if (directTag) {
    const value = Math.abs(Number.parseFloat(directTag))
    if (!Number.isNaN(value) && value > 0) return value.toFixed(2)
  }

  return null
}

export type ParseNubankOfxResult = {
  parsed: ImportStatementBody
  transactionsCount: number
  ofxAccountId: string
  suggestedAccount: SuggestedCreditCardAccount
}

export function parseNubankOfx(input: {
  content: string
  fileName: string
  closingDay?: number | null
  dueDay?: number | null
}): ParseNubankOfxResult {
  const normalized = input.content.replace(/^\uFEFF/, '')

  const org = extractTag(normalized, 'ORG')
  if (org?.toUpperCase() !== NUBANK_ORG) {
    throw badRequest(
      'OFX não reconhecido — apenas exportações do Nubank (NU PAGAMENTOS S.A.) são suportadas'
    )
  }

  const ofxAccountId = extractTag(normalized, 'ACCTID')
  if (!ofxAccountId) {
    throw badRequest('OFX inválido: ACCTID não encontrado')
  }

  const dtStart = extractTag(normalized, 'DTSTART')
  const dtEnd = extractTag(normalized, 'DTEND')
  const balAmt = extractTag(normalized, 'BALAMT')
  const dtAsOf = extractTag(normalized, 'DTASOF')

  if (!dtStart || !dtEnd || !balAmt) {
    throw badRequest('OFX inválido: faltam DTSTART, DTEND ou BALAMT')
  }

  const transactions = parseTransactionsFromOfx(normalized)
  const fileHash = createHash('sha256').update(normalized).digest('hex')
  const totalAmount = Math.abs(Number.parseFloat(balAmt)).toFixed(2)
  const periodStart = parseOfxDate(dtStart)
  const periodEnd = parseOfxDate(dtEnd)
  const closingDate = dtAsOf ? parseOfxDate(dtAsOf) : periodEnd
  const dueDate = inferDueDate(dtEnd, input.fileName, {
    closingDay: input.closingDay,
    dueDay: input.dueDay,
  })

  const suggestedClosingDay = extractClosingDayFromOfx(dtEnd, dtAsOf)
  const suggestedDueDay = extractDueDayFromFileName(input.fileName)

  const cycleClosed = isBillingCycleClosed(periodEnd)
  const { suggestedPaid } = suggestPaidFromStatement({
    totalAmount,
    periodEnd,
    dueDate,
    transactions,
  })

  const summary = deriveImportedStatementSummary({
    totalAmount,
    periodStart,
    periodEnd,
    dueDate,
    transactions,
  })

  return {
    parsed: {
      fileHash,
      fileName: input.fileName,
      periodStart,
      periodEnd,
      closingDate,
      dueDate,
      totalAmount,
      previousBalance: summary.previousBalance,
      purchasesTotal: summary.purchasesTotal,
      paymentsReceived: summary.paymentsReceived,
      importSource: 'ofx',
      isClosed: cycleClosed,
      isPaid: cycleClosed ? suggestedPaid : false,
      transactions,
    },
    transactionsCount: transactions.length,
    ofxAccountId,
    suggestedAccount: {
      name: 'Nubank',
      institution: 'nubank',
      currency: 'BRL',
      closingDay: suggestedClosingDay,
      dueDay: suggestedDueDay,
      creditLimit: extractCreditLimitFromOfx(normalized),
    },
  }
}
