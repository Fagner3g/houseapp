import { createHash } from 'node:crypto'

import { badRequest } from '@/core/errors'

import type { FinancialContext, ToolCallPayload, ToolPreviewResult } from './types'

function resolveAccount(
  context: FinancialContext,
  accountId?: unknown,
  accountName?: unknown
): { id: string; name: string } {
  if (typeof accountId === 'string' && accountId) {
    const account = context.accounts.find(item => item.id === accountId)

    if (!account) {
      throw badRequest('Account not found')
    }

    return { id: account.id, name: account.name }
  }

  if (typeof accountName === 'string' && accountName.trim()) {
    const normalized = accountName.trim().toLowerCase()
    const account = context.accounts.find(item => item.name.toLowerCase().includes(normalized))

    if (!account) {
      throw badRequest(`Account not found: ${accountName}`)
    }

    return { id: account.id, name: account.name }
  }

  throw badRequest('account_id or account_name is required for import_statement')
}

function normalizeTransactionItem(item: unknown, index: number) {
  if (!item || typeof item !== 'object') {
    throw badRequest(`Invalid transaction at index ${index}`)
  }

  const row = item as Record<string, unknown>
  const title = typeof row.title === 'string' ? row.title.trim() : ''

  if (!title) {
    throw badRequest(`Transaction title required at index ${index}`)
  }

  const amountRaw = row.amount
  let amount: string
  let type: 'income' | 'expense' = 'expense'

  if (typeof amountRaw === 'number') {
    type = amountRaw < 0 ? 'income' : 'expense'
    amount = Math.abs(amountRaw).toFixed(2)
  } else if (typeof amountRaw === 'string') {
    const cleaned = amountRaw.replace(/[R$\s]/gi, '').replace(',', '.')
    const parsed = Number.parseFloat(cleaned)

    if (Number.isNaN(parsed)) {
      throw badRequest(`Invalid amount at index ${index}`)
    }

    type = parsed < 0 ? 'income' : 'expense'
    amount = Math.abs(parsed).toFixed(2)
  } else {
    throw badRequest(`Invalid amount at index ${index}`)
  }

  if (row.type === 'income' || row.type === 'expense') {
    type = row.type
  }

  const installmentNumber =
    typeof row.installmentNumber === 'number' ? row.installmentNumber : undefined
  const installmentsTotal =
    typeof row.installmentsTotal === 'number' ? row.installmentsTotal : undefined

  return {
    title,
    amount,
    type,
    date:
      typeof row.date === 'string' && row.date
        ? row.date
        : new Date().toISOString().slice(0, 10),
    competenceDate: typeof row.competenceDate === 'string' ? row.competenceDate : undefined,
    cardLastFour: typeof row.cardLastFour === 'string' ? row.cardLastFour : undefined,
    installmentNumber,
    installmentsTotal,
    externalId: typeof row.externalId === 'string' ? row.externalId : undefined,
    categoryIds: Array.isArray(row.categoryIds)
      ? row.categoryIds.filter((id): id is string => typeof id === 'string')
      : undefined,
    counterparty: typeof row.counterparty === 'string' ? row.counterparty : undefined,
  }
}

function parseOptionalSummaryField(payload: ToolCallPayload, key: string): string | undefined {
  const value = payload[key]

  if (typeof value !== 'string' || !value.trim()) {
    return undefined
  }

  const cleaned = value.replace(/[R$\s]/gi, '').replace(',', '.')
  const parsed = Number.parseFloat(cleaned)

  if (Number.isNaN(parsed)) {
    return undefined
  }

  return Math.abs(parsed).toFixed(2)
}

export function previewImportStatement(
  context: FinancialContext,
  payload: ToolCallPayload
): ToolPreviewResult {
  const account = resolveAccount(context, payload.account_id, payload.account_name)

  const rawTransactions = payload.transactions

  if (!Array.isArray(rawTransactions) || rawTransactions.length === 0) {
    throw badRequest('transactions array is required for import_statement')
  }

  const transactions = rawTransactions.map((item, index) => normalizeTransactionItem(item, index))

  const expensesTotal = transactions
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)

  const incomeTotal = transactions
    .filter(item => item.type === 'income')
    .reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)

  const totalAmount =
    typeof payload.total_amount === 'string' && payload.total_amount
      ? parseOptionalSummaryField(payload, 'total_amount') ??
        (expensesTotal - incomeTotal).toFixed(2)
      : (expensesTotal - incomeTotal).toFixed(2)

  const now = new Date()
  const periodStart =
    typeof payload.period_start === 'string' ? payload.period_start : now.toISOString()
  const periodEnd = typeof payload.period_end === 'string' ? payload.period_end : now.toISOString()
  const closingDate =
    typeof payload.closing_date === 'string' ? payload.closing_date : now.toISOString()
  const dueDate = typeof payload.due_date === 'string' ? payload.due_date : now.toISOString()

  const fileName =
    typeof payload.file_name === 'string' && payload.file_name
      ? payload.file_name
      : 'ai-import.json'

  const fileHash =
    typeof payload.file_hash === 'string' && payload.file_hash.length === 64
      ? payload.file_hash
      : createHash('sha256')
          .update(JSON.stringify({ accountId: account.id, transactions, periodStart, periodEnd }))
          .digest('hex')

  const data = {
    accountId: account.id,
    accountName: account.name,
    fileHash,
    fileName,
    periodStart,
    periodEnd,
    closingDate,
    dueDate,
    totalAmount,
    minimumPayment:
      typeof payload.minimum_payment === 'string' ? payload.minimum_payment : undefined,
    previousBalance: parseOptionalSummaryField(payload, 'previous_balance'),
    paymentsReceived: parseOptionalSummaryField(payload, 'payments_received'),
    purchasesTotal: parseOptionalSummaryField(payload, 'purchases_total'),
    otherCharges: parseOptionalSummaryField(payload, 'other_charges'),
    nextInvoiceBalance: parseOptionalSummaryField(payload, 'next_invoice_balance'),
    totalOpenBalance: parseOptionalSummaryField(payload, 'total_open_balance'),
    transactions,
    transactionsPreview: transactions.slice(0, 10).map(item => ({
      title: item.title,
      amount: item.amount,
      type: item.type,
      date: item.date,
    })),
    transactionsCount: transactions.length,
  }

  return {
    action: 'import_statement',
    data,
    message: `Preview: importar fatura de ${account.name} com ${transactions.length} transações (total R$ ${totalAmount.replace('.', ',')}).`,
  }
}
