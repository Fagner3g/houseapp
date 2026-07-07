import { createHash } from 'node:crypto'

import { PDFParse } from 'pdf-parse'
import z from 'zod'

import { env } from '@/config/env'
import { badRequest } from '@/core/errors'
import {
  completeWithProvider,
  listAvailableProviders,
  type ProviderName,
} from '@/domain/ai/providers'

import {
  parseNubankMetadataFromText,
  parseNubankTransactionsFromText,
  type ParsedLineTransaction,
} from './nubank-text-parser'
import type { ImportStatementBody } from './statement.schema'
import { assignStatementExternalIds } from './statement-transaction-external-id'

const parsedTransactionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  amount: z.union([z.string(), z.number()]),
  date: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
  installmentNumber: z.number().int().positive().optional(),
  installmentsTotal: z.number().int().positive().optional(),
  counterparty: z.string().optional(),
})

const parsedStatementSchema = z.object({
  fileName: z.string().min(1).optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  closingDate: z.string().optional(),
  dueDate: z.string().optional(),
  totalAmount: z.union([z.string(), z.number()]).optional(),
  minimumPayment: z.union([z.string(), z.number()]).optional(),
  previousBalance: z.union([z.string(), z.number()]).optional(),
  paymentsReceived: z.union([z.string(), z.number()]).optional(),
  purchasesTotal: z.union([z.string(), z.number()]).optional(),
  otherCharges: z.union([z.string(), z.number()]).optional(),
  nextInvoiceBalance: z.union([z.string(), z.number()]).optional(),
  totalOpenBalance: z.union([z.string(), z.number()]).optional(),
  transactions: z.array(parsedTransactionSchema).optional(),
})

const STATEMENT_PARSE_SYSTEM_PROMPT = `Você extrai metadados de faturas de cartão de crédito brasileiras a partir do texto do PDF.

Retorne APENAS JSON válido (sem markdown) neste formato:
{
  "periodStart": "2026-05-01T12:00:00.000Z",
  "periodEnd": "2026-06-01T12:00:00.000Z",
  "closingDate": "2026-06-01T12:00:00.000Z",
  "dueDate": "2026-06-08T12:00:00.000Z",
  "totalAmount": "6983.61",
  "minimumPayment": "1047.54",
  "previousBalance": "6104.49",
  "paymentsReceived": "6104.49",
  "purchasesTotal": "6126.68",
  "otherCharges": "856.93",
  "nextInvoiceBalance": "1189.17",
  "totalOpenBalance": "3320.03"
}

Regras:
- Valores monetários como string decimal com ponto (ex: "6983.61") — somente se aparecerem no PDF.
- Datas em ISO-8601 UTC — somente se aparecerem no PDF.
- Extraia apenas o resumo da fatura; NÃO liste transações individuais.
- JAMAIS invente valores, datas ou totais. Se um campo não estiver presente ou for ilegível, omita-o do JSON.
- Não use zero, null ou estimativas para preencher lacunas.`

export type ParseStatementPdfResult = {
  parsed: ImportStatementBody
  provider: ProviderName | 'regex'
  transactionsCount: number
  extractedTextLength: number
  extractedText: string
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })

  try {
    const result = await parser.getText()
    const text = result.text?.trim() ?? ''

    if (!text) {
      throw badRequest('Não foi possível extrair texto do PDF')
    }

    return text
  } finally {
    await parser.destroy()
  }
}

function moneyToString(value: string | number | null | undefined): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'number') return value.toFixed(2)
  const cleaned = value.replace(/[R$\s]/gi, '').replace(',', '.')
  const parsed = Number.parseFloat(cleaned)
  return Number.isNaN(parsed) ? undefined : Math.abs(parsed).toFixed(2)
}

function normalizeLlmTransaction(row: z.infer<typeof parsedTransactionSchema>): ParsedLineTransaction | null {
  const title = (row.title ?? row.description)?.trim()
  if (!title) return null

  const amount = moneyToString(row.amount)
  if (!amount) return null

  let type = row.type ?? 'expense'
  if (!row.type && (title.toLowerCase().includes('pagamento') || title.toLowerCase().includes('crédito'))) {
    type = 'income'
  }

  const date =
    row.date && row.date.includes('T')
      ? row.date
      : row.date
        ? `${row.date}T12:00:00.000Z`
        : new Date().toISOString()

  return {
    title,
    amount,
    date,
    type,
    installmentNumber: row.installmentNumber,
    installmentsTotal: row.installmentsTotal,
  }
}

function extractJsonFromLlmResponse(raw: string): unknown | null {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)

  const candidate = fenced?.[1]?.trim() ?? trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')

  if (start < 0 || end <= start) return null

  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    return null
  }
}

function resolveProvider(preferred?: ProviderName): ProviderName | null {
  const available = listAvailableProviders()

  if (available.length === 0) return null

  if (preferred && available.some(item => item.name === preferred)) {
    return preferred
  }

  const fromEnv = env.AI_REPORT_PROVIDER
  if (available.some(item => item.name === fromEnv)) {
    return fromEnv
  }

  return available[0]!.name
}

function inferYearFromText(text: string): number {
  const match = text.match(/\b(20\d{2})\b/)
  return match ? Number.parseInt(match[1]!, 10) : new Date().getFullYear()
}

export async function parseStatementPdf(input: {
  buffer: Buffer
  fileName: string
  provider?: ProviderName
}): Promise<ParseStatementPdfResult> {
  const fileHash = createHash('sha256').update(input.buffer).digest('hex')
  const extractedText = await extractPdfText(input.buffer)
  const regexMeta = parseNubankMetadataFromText(extractedText)
  const regexTransactions = parseNubankTransactionsFromText(
    extractedText,
    inferYearFromText(extractedText)
  )

  const providerName = resolveProvider(input.provider)
  let llmMeta: z.infer<typeof parsedStatementSchema> | null = null
  let llmTransactions: ParsedLineTransaction[] = []

  if (providerName) {
    const userPrompt = `Arquivo: ${input.fileName}

Texto extraído do PDF (trecho inicial + resumo):
---
${extractedText.slice(0, 12_000)}
---`

    try {
      const llmResponse = await completeWithProvider(
        providerName,
        [{ role: 'user', content: userPrompt }],
        STATEMENT_PARSE_SYSTEM_PROMPT
      )

      const parsedJson = extractJsonFromLlmResponse(llmResponse)
      const validated = parsedStatementSchema.safeParse(parsedJson)

      if (validated.success) {
        llmMeta = validated.data

        if (validated.data.transactions?.length) {
          llmTransactions = validated.data.transactions
            .map(normalizeLlmTransaction)
            .filter((item): item is ParsedLineTransaction => item !== null)
        }
      }
    } catch {
      // fallback para regex abaixo
    }
  }

  const rawTransactions =
    llmTransactions.length >= regexTransactions.length * 0.8
      ? llmTransactions
      : regexTransactions.length > 0
        ? regexTransactions
        : llmTransactions

  const transactions = assignStatementExternalIds(rawTransactions)

  if (transactions.length === 0) {
    throw badRequest(
      providerName
        ? 'Não foi possível extrair transações do PDF. Verifique se é uma fatura de cartão suportada.'
        : 'Nenhum provedor de IA configurado e o parser automático não encontrou transações.'
    )
  }

  const periodStart =
    llmMeta?.periodStart ?? regexMeta.periodStart ?? transactions[0]!.date
  const periodEnd = llmMeta?.periodEnd ?? regexMeta.periodEnd ?? transactions.at(-1)!.date
  const closingDate = llmMeta?.closingDate ?? regexMeta.closingDate ?? periodEnd
  const dueDate = llmMeta?.dueDate ?? regexMeta.dueDate ?? periodEnd

  const expensesTotal = transactions
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)

  const incomeTotal = transactions
    .filter(item => item.type === 'income')
    .reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)

  const computedTotal = (expensesTotal - incomeTotal).toFixed(2)

  const totalAmount =
    moneyToString(llmMeta?.totalAmount) ?? regexMeta.totalAmount ?? computedTotal

  return {
    parsed: {
      fileHash,
      fileName: llmMeta?.fileName ?? input.fileName,
      periodStart,
      periodEnd,
      closingDate,
      dueDate,
      totalAmount,
      minimumPayment: moneyToString(llmMeta?.minimumPayment) ?? regexMeta.minimumPayment ?? undefined,
      previousBalance: moneyToString(llmMeta?.previousBalance) ?? regexMeta.previousBalance ?? undefined,
      paymentsReceived: moneyToString(llmMeta?.paymentsReceived) ?? regexMeta.paymentsReceived ?? undefined,
      purchasesTotal: moneyToString(llmMeta?.purchasesTotal) ?? regexMeta.purchasesTotal ?? undefined,
      otherCharges: moneyToString(llmMeta?.otherCharges) ?? regexMeta.otherCharges ?? undefined,
      nextInvoiceBalance:
        moneyToString(llmMeta?.nextInvoiceBalance) ?? regexMeta.nextInvoiceBalance ?? undefined,
      totalOpenBalance: moneyToString(llmMeta?.totalOpenBalance) ?? regexMeta.totalOpenBalance ?? undefined,
      importSource: 'pdf',
      isClosed: true,
      isPaid: Number(totalAmount) <= 0,
      transactions,
    },
    provider: providerName ?? 'regex',
    transactionsCount: transactions.length,
    extractedTextLength: extractedText.length,
    extractedText,
  }
}
