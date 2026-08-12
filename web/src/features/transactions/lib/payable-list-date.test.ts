import assert from 'node:assert/strict'
import dayjs from 'dayjs'
import { describe, it } from 'vitest'

import { isoToCalendarDate } from '@/lib/date'

import { getPayableListDate } from './payable-list-date'

describe('getPayableListDate', () => {
  it('uses the scheduled date while it is still in the future', () => {
    const dueDate = '2026-05-15T12:00:00.000Z'
    const scheduled = dayjs().add(3, 'day').endOf('day').toISOString()
    const result = getPayableListDate({
      status: 'pending',
      date: dueDate,
      paymentScheduledAt: scheduled,
    })
    assert.equal(result.displayDay, isoToCalendarDate(scheduled))
    assert.match(result.dueSubtext ?? '', /Venc\./)
  })

  it('falls back to due date after the schedule expires', () => {
    const dueDate = '2026-05-15T12:00:00.000Z'
    const result = getPayableListDate({
      status: 'pending',
      date: dueDate,
      paymentScheduledAt: dayjs().subtract(1, 'day').endOf('day').toISOString(),
    })
    assert.equal(result.displayDay, '2026-05-15')
    assert.equal(result.dueSubtext, null)
  })
})
