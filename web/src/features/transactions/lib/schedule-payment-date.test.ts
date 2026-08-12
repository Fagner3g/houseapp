import assert from 'node:assert/strict'
import dayjs from 'dayjs'
import { describe, it } from 'vitest'

import { isoToCalendarDate } from '@/lib/date'

import { defaultScheduleDate, isScheduleDateValid } from './schedule-payment-date'

describe('schedule-payment-date', () => {
  it('defaults to today when due date is in the past', () => {
    const today = dayjs().format('YYYY-MM-DD')
    assert.equal(defaultScheduleDate('2026-01-01'), today)
  })

  it('defaults to today when previous schedule has expired', () => {
    const today = dayjs().format('YYYY-MM-DD')
    const expired = dayjs().subtract(2, 'day').endOf('day').toISOString()
    assert.equal(defaultScheduleDate('2026-01-01', expired), today)
  })

  it('keeps a future scheduled date', () => {
    const iso = dayjs().add(5, 'day').endOf('day').toISOString()
    assert.equal(defaultScheduleDate('2026-01-01', iso), isoToCalendarDate(iso))
  })

  it('rejects dates before today', () => {
    assert.equal(isScheduleDateValid(dayjs().subtract(1, 'day').format('YYYY-MM-DD')), false)
    assert.equal(isScheduleDateValid(dayjs().format('YYYY-MM-DD')), true)
  })
})
