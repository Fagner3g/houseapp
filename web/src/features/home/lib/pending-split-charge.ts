import type { ListPendingSplits200SplitsItem } from '@/api/generated/model'
import type { ManualAlertType } from '@/features/settings/api/send-manual-alert'
import dayjs from 'dayjs'

/** Same key shape used by alert manual send (`user:` / `contact:`). */
export function pendingSplitTargetKey(split: ListPendingSplits200SplitsItem): string {
  if (split.userId) return `user:${split.userId}`
  const name = (split.contactName ?? '').trim().toLowerCase()
  const phone = (split.contactPhone ?? '').trim()
  return `contact:${name}:${phone}`
}

export function pendingSplitAlertType(split: ListPendingSplits200SplitsItem): ManualAlertType {
  const due = dayjs(split.transactionDate).startOf('day')
  return due.isBefore(dayjs().startOf('day')) ? 'overdue' : 'upcoming'
}
