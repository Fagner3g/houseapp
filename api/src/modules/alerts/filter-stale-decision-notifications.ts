import type { NotificationRecord } from '@/modules/alerts/notification.repository'

const DECISION_KIND = 'split_payment_request'

export function collectDecisionRequestIds(rows: NotificationRecord[]): string[] {
  return [
    ...new Set(
      rows
        .filter(row => row.metadata?.kind === DECISION_KIND)
        .map(row => row.metadata?.requestId)
        .filter((id): id is string => typeof id === 'string')
    ),
  ]
}

/** Keeps non-decision rows and decision rows whose request is still pending. */
export function keepActiveDecisionNotifications(
  rows: NotificationRecord[],
  pendingRequestIds: Set<string>
): { active: NotificationRecord[]; staleRequestIds: string[] } {
  const staleRequestIds: string[] = []
  const active = rows.filter(row => {
    if (row.metadata?.kind !== DECISION_KIND) return true
    const requestId = row.metadata?.requestId
    if (typeof requestId !== 'string') return false
    if (pendingRequestIds.has(requestId)) return true
    staleRequestIds.push(requestId)
    return false
  })

  return { active, staleRequestIds: [...new Set(staleRequestIds)] }
}
