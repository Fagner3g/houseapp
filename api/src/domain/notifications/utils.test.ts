import assert from 'node:assert'
import { describe, it } from 'node:test'
import dayjs from 'dayjs'
import { calculateNextEligibleAt, isWithinQuietHours } from './utils'

describe('isWithinQuietHours', () => {
  it('detects range within same day', () => {
    const now = dayjs('2024-01-01T23:00:00Z').toDate()
    assert.equal(isWithinQuietHours(now, '22:00', '23:30', 'UTC'), true)
  })

  it('detects range crossing midnight', () => {
    const now = dayjs('2024-01-02T01:00:00Z').toDate()
    assert.equal(isWithinQuietHours(now, '22:00', '07:00', 'UTC'), true)
  })

  it('outside quiet hours', () => {
    const now = dayjs('2024-01-02T08:00:00Z').toDate()
    assert.equal(isWithinQuietHours(now, '22:00', '07:00', 'UTC'), false)
  })
})

describe('calculateNextEligibleAt', () => {
  it('returns null when repeat not set', () => {
    assert.equal(calculateNextEligibleAt(new Date(), null), null)
  })

  it('adds minutes when repeat set', () => {
    const last = dayjs('2024-01-01T00:00:00Z').toDate()
    const next = calculateNextEligibleAt(last, 60)
    assert.equal(dayjs(next!).toISOString(), dayjs(last).add(60, 'minute').toISOString())
  })
})
