import { describe, expect, it } from 'vitest'

import {
  canNavigateToNextBillingMonth,
  latestImportedBillingMonthKey,
  latestNavigableBillingMonthKey,
  maxBillingMonthKey,
} from './navigable-billing-month'

describe('maxBillingMonthKey', () => {
  it('returns the latest YYYY-MM key', () => {
    expect(maxBillingMonthKey('2026-06', null, '2026-08', '2026-07')).toBe('2026-08')
  })
})

describe('latestImportedBillingMonthKey', () => {
  it('uses statement view month from closing date', () => {
    expect(
      latestImportedBillingMonthKey(
        [
          {
            closingDate: '2026-07-01T12:00:00.000Z',
            dueDate: '2026-07-17T12:00:00.000Z',
          },
          {
            closingDate: '2026-08-01T12:00:00.000Z',
            dueDate: '2026-08-17T12:00:00.000Z',
          },
        ],
        1,
        17
      )
    ).toBe('2026-08')
  })
})

describe('latestNavigableBillingMonthKey', () => {
  it('allows navigating past the calendar month when a future statement exists', () => {
    expect(
      latestNavigableBillingMonthKey(
        [
          {
            closingDate: '2026-08-10T12:00:00.000Z',
            dueDate: '2026-08-17T12:00:00.000Z',
          },
        ],
        10,
        17,
        '2026-07'
      )
    ).toBe('2026-08')
  })

  it('stays on the current month without future imports', () => {
    expect(
      latestNavigableBillingMonthKey(
        [
          {
            closingDate: '2026-06-01T12:00:00.000Z',
            dueDate: '2026-06-08T12:00:00.000Z',
          },
        ],
        1,
        8,
        '2026-07'
      )
    ).toBe('2026-07')
  })
})

describe('canNavigateToNextBillingMonth', () => {
  it('enables next while viewing before the navigable ceiling', () => {
    expect(canNavigateToNextBillingMonth('2026-07', '2026-08')).toBe(true)
    expect(canNavigateToNextBillingMonth('2026-08', '2026-08')).toBe(false)
  })
})
