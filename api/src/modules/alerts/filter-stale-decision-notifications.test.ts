import { describe, expect, it } from 'vitest'

import {
  collectDecisionRequestIds,
  keepActiveDecisionNotifications,
} from './filter-stale-decision-notifications'
import type { NotificationRecord } from './notification.repository'

function notification(
  overrides: Partial<NotificationRecord> & Pick<NotificationRecord, 'id' | 'metadata'>
): NotificationRecord {
  return {
    organizationId: 'org_1',
    userId: 'user_1',
    alertRuleId: null,
    transactionId: 'tx_1',
    accountId: null,
    title: 'Confirmação de pagamento',
    body: 'body',
    channel: 'in_app',
    status: 'sent',
    sentAt: new Date('2026-07-15T20:41:18.000Z'),
    readAt: null,
    dedupeKey: `dedupe:${overrides.id}`,
    createdAt: new Date('2026-07-15T20:41:18.000Z'),
    ...overrides,
  }
}

describe('keepActiveDecisionNotifications', () => {
  it('drops decision notifications whose payment request is no longer pending', () => {
    const rows = [
      notification({
        id: 'n_stale',
        metadata: { kind: 'split_payment_request', requestId: 'req_cancelled' },
      }),
      notification({
        id: 'n_active',
        metadata: { kind: 'split_payment_request', requestId: 'req_pending' },
      }),
      notification({
        id: 'n_info',
        title: 'Aviso',
        metadata: { kind: 'overdue' },
      }),
    ]

    const { active, staleRequestIds } = keepActiveDecisionNotifications(
      rows,
      new Set(['req_pending'])
    )

    expect(active.map(n => n.id)).toEqual(['n_active', 'n_info'])
    expect(staleRequestIds).toEqual(['req_cancelled'])
    expect(collectDecisionRequestIds(rows)).toEqual(['req_cancelled', 'req_pending'])
  })
})
