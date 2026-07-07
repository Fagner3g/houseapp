import { badRequest } from '@/core/errors'

import type { FinancialContext, ToolCallPayload, ToolPreviewResult } from './types'

export function previewRegisterSplitPayment(
  _context: FinancialContext,
  payload: ToolCallPayload
): ToolPreviewResult {
  const splitId = typeof payload.split_id === 'string' ? payload.split_id : undefined

  if (!splitId) {
    throw badRequest('split_id is required for register_split_payment')
  }

  const amount =
    typeof payload.amount === 'string'
      ? payload.amount
      : typeof payload.amount === 'number'
        ? payload.amount.toFixed(2)
        : undefined

  if (!amount) {
    throw badRequest('amount is required for register_split_payment')
  }

  const contactName =
    typeof payload.contact_name === 'string' ? payload.contact_name : 'Participante'

  const data = {
    splitId,
    contactName,
    amount,
    paidAt:
      typeof payload.paid_at === 'string' && payload.paid_at
        ? payload.paid_at
        : new Date().toISOString(),
    stub: true,
  }

  return {
    action: 'register_split_payment',
    data,
    message: `Preview (stub): registrar pagamento de R$ ${amount.replace('.', ',')} de ${contactName}. Confirmação ainda não executa no backend.`,
  }
}
