import { badRequest } from '@/core/errors'

import type { FinancialContext, ToolCallPayload, ToolPreviewResult } from './types'

function findTransaction(
  context: FinancialContext,
  transactionId?: unknown,
  searchTitle?: unknown
) {
  if (typeof transactionId === 'string' && transactionId) {
    const transaction = context.recentTransactions.find(item => item.id === transactionId)

    if (!transaction) {
      throw badRequest('Transaction not found')
    }

    return transaction
  }

  if (typeof searchTitle === 'string' && searchTitle.trim()) {
    const normalized = searchTitle.trim().toLowerCase()
    const matches = context.recentTransactions.filter(
      item =>
        (item.status === 'pending' || item.status === 'partial') &&
        item.title.toLowerCase().includes(normalized)
    )

    if (matches.length === 0) {
      throw badRequest(`No pending transaction found matching: ${searchTitle}`)
    }

    return matches[0]
  }

  throw badRequest('transaction_id or search_title is required for pay_transaction')
}

export function previewPayTransaction(
  context: FinancialContext,
  payload: ToolCallPayload
): ToolPreviewResult {
  const transaction = findTransaction(context, payload.transaction_id, payload.search_title)

  if (transaction.status === 'paid') {
    throw badRequest('Transaction is already paid')
  }

  const paidAt =
    typeof payload.paid_at === 'string' && payload.paid_at
      ? payload.paid_at
      : new Date().toISOString()

  const data = {
    transactionId: transaction.id,
    title: transaction.title,
    amount: transaction.amount,
    paidAt,
    paidAmount: typeof payload.paid_amount === 'string' ? payload.paid_amount : transaction.amount,
  }

  return {
    action: 'pay_transaction',
    data,
    message: `Preview: marcar "${transaction.title}" como pago.`,
  }
}
