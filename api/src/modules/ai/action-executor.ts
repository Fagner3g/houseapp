import { badRequest, notFound } from '@/core/errors'
import { container } from '@/core/container'

import type { PendingAction } from './action-store'
import { previewCreateTransaction } from './tools/create-transaction.tool'
import { previewCreateSplit } from './tools/create-split.tool'
import { previewImportStatement } from './tools/import-statement.tool'
import { previewPayTransaction } from './tools/pay-transaction.tool'
import { previewRegisterSplitPayment } from './tools/register-split-payment.tool'
import type { ToolCallPayload } from './tools/types'

export type ActionExecutionResult = {
  action: PendingAction['action']
  entityId: string
  result: unknown
}

type CreateTransactionData = {
  title: string
  amount: string
  type: 'income' | 'expense' | 'transfer'
  accountId: string
  categoryIds?: string[]
  date: string
  status?: 'pending' | 'paid'
  description?: string | null
  source: 'ai_chat'
}

type ImportStatementData = {
  accountId: string
  fileHash: string
  fileName: string
  periodStart: string
  periodEnd: string
  closingDate: string
  dueDate: string
  totalAmount: string
  minimumPayment?: string
  previousBalance?: string
  paymentsReceived?: string
  purchasesTotal?: string
  otherCharges?: string
  nextInvoiceBalance?: string
  totalOpenBalance?: string
  transactions: Array<{
    title: string
    amount: string
    type?: 'income' | 'expense'
    date: string
    competenceDate?: string
    cardLastFour?: string
    installmentNumber?: number
    installmentsTotal?: number
    externalId?: string
    categoryIds?: string[]
    counterparty?: string
  }>
}

type PayTransactionData = {
  transactionId: string
  paidAt?: string
  paidAmount?: string | null
}

export async function executeAction(action: PendingAction): Promise<ActionExecutionResult> {
  switch (action.action) {
    case 'create_transaction':
      return executeCreateTransaction(action)
    case 'import_statement':
      return executeImportStatement(action)
    case 'pay_transaction':
      return executePayTransaction(action)
    case 'create_split':
    case 'register_split_payment':
      throw badRequest('Action not yet implemented — preview only in v1')
    default:
      throw badRequest('Unknown action')
  }
}

async function executeCreateTransaction(action: PendingAction): Promise<ActionExecutionResult> {
  const data = action.data as CreateTransactionData

  const created = await container.transactionService.create(action.orgId, {
    title: data.title,
    amount: data.amount,
    type: data.type,
    accountId: data.accountId,
    categoryIds: data.categoryIds,
    date: data.date,
    status: data.status ?? 'pending',
    description: data.description,
    source: 'ai_chat',
    paidAt: data.status === 'paid' ? new Date().toISOString() : undefined,
    paidAmount: data.status === 'paid' ? data.amount : undefined,
  }, action.userId)

  return {
    action: action.action,
    entityId: created.transaction.id,
    result: { transaction: created.transaction },
  }
}

async function executeImportStatement(action: PendingAction): Promise<ActionExecutionResult> {
  const data = action.data as ImportStatementData

  const result = await container.statementService.import(action.orgId, data.accountId, action.userId, {
    fileHash: data.fileHash,
    fileName: data.fileName,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    closingDate: data.closingDate,
    dueDate: data.dueDate,
    totalAmount: data.totalAmount,
    minimumPayment: data.minimumPayment,
    previousBalance: data.previousBalance,
    paymentsReceived: data.paymentsReceived,
    purchasesTotal: data.purchasesTotal,
    otherCharges: data.otherCharges,
    nextInvoiceBalance: data.nextInvoiceBalance,
    totalOpenBalance: data.totalOpenBalance,
    importSource: undefined,
    isClosed: true,
    isPaid: false,
    transactions: data.transactions,
  })

  return {
    action: action.action,
    entityId: result.statement.id,
    result,
  }
}

async function executePayTransaction(action: PendingAction): Promise<ActionExecutionResult> {
  const data = action.data as PayTransactionData

  const paid = await container.transactionService.pay(action.orgId, data.transactionId, {
    paidAt: data.paidAt,
    paidAmount: data.paidAmount,
  })

  return {
    action: action.action,
    entityId: paid.id,
    result: { transaction: paid },
  }
}

export function previewToolCall(
  context: Awaited<ReturnType<typeof import('./financial-context').buildFinancialContext>>,
  payload: ToolCallPayload
) {
  switch (payload.action) {
    case 'create_transaction':
      return previewCreateTransaction(context, payload)
    case 'import_statement':
      return previewImportStatement(context, payload)
    case 'pay_transaction':
      return previewPayTransaction(context, payload)
    case 'create_split':
      return previewCreateSplit(context, payload)
    case 'register_split_payment':
      return previewRegisterSplitPayment(context, payload)
    default:
      throw notFound('Unknown tool action')
  }
}
