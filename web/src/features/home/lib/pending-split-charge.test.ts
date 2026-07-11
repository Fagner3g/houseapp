import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'

import type { ListPendingSplits200SplitsItem } from '@/api/generated/model'

import { pendingSplitAlertType, pendingSplitTargetKey } from './pending-split-charge'

function split(
  overrides: Partial<ListPendingSplits200SplitsItem> = {}
): ListPendingSplits200SplitsItem {
  return {
    id: 's1',
    transactionId: 't1',
    userId: null,
    contactName: 'Aline',
    contactPhone: '11999999999',
    contactEmail: null,
    amount: '100.00',
    description: null,
    status: 'pending',
    paidAmount: '0.00',
    paidAt: null,
    isNotified: false,
    lastNotifiedAt: null,
    notifyEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    transactionTitle: 'Compra',
    transactionDate: dayjs().toISOString(),
    transactionAmount: '100.00',
    personName: 'Aline',
    ...overrides,
  }
}

describe('pendingSplitTargetKey', () => {
  it('uses user key for members', () => {
    expect(pendingSplitTargetKey(split({ userId: 'u1', contactName: null, contactPhone: null }))).toBe(
      'user:u1'
    )
  })

  it('uses contact key for externals', () => {
    expect(pendingSplitTargetKey(split())).toBe('contact:aline:11999999999')
  })
})

describe('pendingSplitAlertType', () => {
  it('marks past dates as overdue', () => {
    expect(
      pendingSplitAlertType(split({ transactionDate: dayjs().subtract(2, 'day').toISOString() }))
    ).toBe('overdue')
  })

  it('marks today/future as upcoming', () => {
    expect(pendingSplitAlertType(split({ transactionDate: dayjs().toISOString() }))).toBe(
      'upcoming'
    )
  })
})
