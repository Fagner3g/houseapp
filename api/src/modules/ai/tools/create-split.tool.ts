import { badRequest } from '@/core/errors'

import type { FinancialContext, ToolCallPayload, ToolPreviewResult } from './types'

export function previewCreateSplit(
  context: FinancialContext,
  payload: ToolCallPayload
): ToolPreviewResult {
  const transactionId =
    typeof payload.transaction_id === 'string' ? payload.transaction_id : undefined

  if (!transactionId) {
    throw badRequest('transaction_id is required for create_split')
  }

  const transaction = context.recentTransactions.find(item => item.id === transactionId)

  if (!transaction) {
    throw badRequest('Transaction not found')
  }

  const contactName =
    typeof payload.contact_name === 'string' ? payload.contact_name : 'Participante'

  const amount =
    typeof payload.amount === 'string'
      ? payload.amount
      : typeof payload.amount === 'number'
        ? payload.amount.toFixed(2)
        : transaction.amount ?? '0.00'

  const data = {
    transactionId,
    transactionTitle: transaction.title,
    contactName,
    amount,
    stub: true,
  }

  return {
    action: 'create_split',
    data,
    message: `Preview (stub): dividir "${transaction.title}" com ${contactName} — R$ ${amount.replace('.', ',')}. Confirmação ainda não executa no backend.`,
  }
}
