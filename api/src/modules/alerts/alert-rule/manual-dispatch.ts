import type { SplitRepository } from '@/modules/splits/split.repository'
import { sendWhatsAppMessage } from '@/domain/whatsapp'
import { areSystemNotificationsEnabled } from '@/modules/system-settings/notifications-enabled'

import {
  buildWhatsAppBatchMessageForTransactions,
  buildWhatsAppMessageForTransaction,
} from '../build-whatsapp-transaction-message'
import { collectManualAlertItems } from './manual-collect'
import type { ManualAlertType } from './types'

export async function sendManualAlertsForTarget(
  splitRepository: SplitRepository,
  params: {
    organizationId: string
    targetKey: string
    recipientName: string
    phone: string
    type: Extract<ManualAlertType, 'overdue' | 'upcoming'>
  }
): Promise<{ sent: number; errors: number; type: string }> {
  if (!(await areSystemNotificationsEnabled())) {
    return { sent: 0, errors: 0, type: params.type }
  }

  const mode = params.type === 'overdue' ? 'overdue' : 'upcoming'
  const items = await collectManualAlertItems(
    splitRepository,
    params.organizationId,
    params.targetKey,
    mode
  )

  if (items.length === 0) {
    return { sent: 0, errors: 0, type: params.type }
  }

  if (items.length === 1) {
    const item = items[0]
    const message = await buildWhatsAppMessageForTransaction({
      recipientName: params.recipientName,
      transactionId: item.transactionId,
      daysUntilDue: item.daysUntilDue,
      kind: item.kind,
      overdueDays: item.overdueDays,
      amountOverride: item.amountOverride,
      isSplit: item.isSplit,
      splitId: item.splitId,
    })

    if (!message) {
      return { sent: 0, errors: 1, type: params.type }
    }

    const result = await sendWhatsAppMessage({ phone: params.phone, message })
    return {
      sent: result.status === 'sent' ? 1 : 0,
      errors: result.status === 'sent' ? 0 : 1,
      type: params.type,
    }
  }

  const message = await buildWhatsAppBatchMessageForTransactions({
    recipientName: params.recipientName,
    items: items.map(item => ({
      transactionId: item.transactionId,
      daysUntilDue: item.daysUntilDue,
      kind: item.kind,
      overdueDays: item.overdueDays,
      amountOverride: item.amountOverride,
      isSplit: item.isSplit,
      splitId: item.splitId,
    })),
  })

  if (!message) {
    return { sent: 0, errors: items.length, type: params.type }
  }

  const result = await sendWhatsAppMessage({ phone: params.phone, message })

  return {
    sent: result.status === 'sent' ? 1 : 0,
    errors: result.status === 'sent' ? 0 : items.length,
    type: params.type,
  }
}
