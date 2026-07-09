import assert from 'node:assert/strict'
import dayjs from 'dayjs'
import { describe, it } from 'vitest'

import {
  formatOverdueDays,
  formatUpcomingDays,
  getPayableStatusBadges,
  isFutureScheduled,
  isOverduePayable,
} from './payable-status'

describe('payable-status', () => {
  it('detects future scheduled payment', () => {
    const tx = {
      status: 'pending',
      date: '2026-06-17T00:00:00.000Z',
      paymentScheduledAt: dayjs().add(2, 'day').endOf('day').toISOString(),
    }
    assert.equal(isFutureScheduled(tx), true)
    assert.equal(isOverduePayable(tx), true)
  })

  it('returns both scheduled and overdue badges', () => {
    const tx = {
      status: 'pending',
      date: '2026-06-17T00:00:00.000Z',
      paymentScheduledAt: dayjs().add(2, 'day').endOf('day').toISOString(),
    }
    const badges = getPayableStatusBadges(tx)
    assert.equal(badges.length, 2)
    assert.equal(badges[0].key, 'scheduled')
    assert.equal(badges[1].key, 'overdue')
    assert.match(badges[1].label, /Vencida há/)
  })

  it('formats overdue days', () => {
    assert.equal(formatOverdueDays(1), 'Vencida há 1 dia')
    assert.equal(formatOverdueDays(5), 'Vencida há 5 dias')
  })

  it('shows upcoming badge for pending due in the future', () => {
    const tx = {
      status: 'pending',
      date: dayjs().add(3, 'day').startOf('day').toISOString(),
    }
    const badges = getPayableStatusBadges(tx)
    assert.equal(badges.length, 1)
    assert.equal(badges[0].key, 'upcoming')
    assert.equal(badges[0].label, 'Vence em 3 dias')
  })

  it('shows Vence hoje for due today', () => {
    const tx = {
      status: 'pending',
      date: dayjs().startOf('day').toISOString(),
    }
    const badges = getPayableStatusBadges(tx)
    assert.equal(badges[0].key, 'upcoming')
    assert.equal(badges[0].label, 'Vence hoje')
  })

  it('does not show upcoming when scheduled', () => {
    const tx = {
      status: 'pending',
      date: dayjs().add(5, 'day').startOf('day').toISOString(),
      paymentScheduledAt: dayjs().add(2, 'day').endOf('day').toISOString(),
    }
    const badges = getPayableStatusBadges(tx)
    assert.equal(badges.length, 1)
    assert.equal(badges[0].key, 'scheduled')
  })

  it('formats upcoming days', () => {
    assert.equal(formatUpcomingDays(0), 'Vence hoje')
    assert.equal(formatUpcomingDays(1), 'Vence amanhã')
    assert.equal(formatUpcomingDays(4), 'Vence em 4 dias')
  })

  it('shows partial payment badge when requested', () => {
    const tx = {
      status: 'pending',
      date: '2026-06-17T00:00:00.000Z',
    }
    const badges = getPayableStatusBadges(tx, { isPartiallyPaid: true })
    assert.equal(badges[0].key, 'partial')
    assert.equal(badges[0].label, 'Pagamento parcial')
    assert.equal(badges[1].key, 'overdue')
  })

  it('shows partial payment badge for partial status', () => {
    const tx = {
      status: 'partial',
      date: dayjs().add(3, 'day').startOf('day').toISOString(),
    }
    const badges = getPayableStatusBadges(tx)
    assert.equal(badges[0].key, 'partial')
    assert.equal(badges[1].key, 'upcoming')
  })
})
