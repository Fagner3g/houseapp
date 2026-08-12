import { formatIsoDateLabel, isoToCalendarDate } from '@/lib/date'

import { isFutureScheduled, type PayableStatusTx } from './payable-status'

export function getPayableListDate(tx: PayableStatusTx) {
  const dueKey = isoToCalendarDate(tx.date)
  const scheduledKey = isFutureScheduled(tx) && tx.paymentScheduledAt
    ? isoToCalendarDate(tx.paymentScheduledAt)
    : null

  if (scheduledKey && scheduledKey !== dueKey) {
    return {
      displayDay: scheduledKey,
      dueSubtext: `Venc. ${formatIsoDateLabel(tx.date)}`,
    }
  }

  if (scheduledKey) {
    return {
      displayDay: scheduledKey,
      dueSubtext: null,
    }
  }

  return {
    displayDay: dueKey,
    dueSubtext: null,
  }
}
