export const DECISION_NOTIFICATION_KIND = 'split_payment_request'

const OVERDUE_KINDS = new Set([
  'overdue',
  'split_overdue',
  'split_external_overdue',
  'invoice_overdue',
  'owner_overdue',
])

const UPCOMING_KINDS = new Set([
  'targeted_upcoming',
  'target_external',
  'split_upcoming',
  'split_external',
  'invoice_upcoming',
  'owner_upcoming',
])

export type NotificationTone = 'decision' | 'overdue' | 'upcoming' | 'info'

export type NotificationMetadata = Record<string, unknown>

export function readNotificationMetadata(
  metadata: Record<string, unknown> | null | undefined
): NotificationMetadata {
  return metadata ?? {}
}

export function readNotificationKind(metadata: NotificationMetadata): string | null {
  return typeof metadata.kind === 'string' ? metadata.kind : null
}

export function isDecisionNotification(metadata: NotificationMetadata): boolean {
  return readNotificationKind(metadata) === DECISION_NOTIFICATION_KIND
}

export function getNotificationTone(metadata: NotificationMetadata): NotificationTone {
  const kind = readNotificationKind(metadata)
  if (kind === DECISION_NOTIFICATION_KIND) return 'decision'
  if (kind && OVERDUE_KINDS.has(kind)) return 'overdue'
  if (kind && UPCOMING_KINDS.has(kind)) return 'upcoming'
  return 'info'
}

export function readRequestId(metadata: NotificationMetadata): string | null {
  return typeof metadata.requestId === 'string' ? metadata.requestId : null
}
