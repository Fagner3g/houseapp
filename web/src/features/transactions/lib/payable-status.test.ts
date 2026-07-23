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

  it('treats partial status as future scheduled', () => {
    const tx = {
      status: 'partial',
      date: '2026-06-17T00:00:00.000Z',
      paymentScheduledAt: dayjs().add(2, 'day').endOf('day').toISOString(),
    }
    assert.equal(isFutureScheduled(tx), true)
  })

  it('shows scheduled plus gray due date when past due but scheduled', () => {
    const dueDate = '2026-06-17T00:00:00.000Z'
    const tx = {
      status: 'pending',
      date: dueDate,
      paymentScheduledAt: dayjs().add(2, 'day').endOf('day').toISOString(),
    }
    const badges = getPayableStatusBadges(tx)
    assert.equal(badges.length, 2)
    assert.equal(badges[0].key, 'scheduled')
    assert.equal(badges[1].key, 'due-date')
    assert.equal(badges[1].label, `Venc. ${dayjs(dueDate).format('DD/MM/YYYY')}`)
    assert.match(badges[1].className, /slate/)
  })

  it('shows overdue only when schedule date has passed', () => {
    const tx = {
      status: 'pending',
      date: '2026-06-17T00:00:00.000Z',
      paymentScheduledAt: dayjs().subtract(1, 'day').endOf('day').toISOString(),
    }
    assert.equal(isFutureScheduled(tx), false)
    const badges = getPayableStatusBadges(tx)
    assert.equal(badges.length, 1)
    assert.equal(badges[0].key, 'overdue')
    assert.match(badges[0].label, /Vencida há/)
  })

  it('formats overdue days', () => {
    assert.equal(formatOverdueDays(1), 'Vencida há 1 dia')
    assert.equal(formatOverdueDays(5), 'Vencida há 5 dias')
    assert.equal(formatOverdueDays(6, { bankBill: true }), 'Conta vencida há 6 dias')
  })

  it('clarifies bank overdue when reimbursement already received', () => {
    const tx = {
      status: 'pending',
      date: '2026-07-17T00:00:00.000Z',
    }
    const badges = getPayableStatusBadges(tx, { reimbursementReceived: true })
    assert.equal(badges[0].key, 'overdue')
    assert.match(badges[0].label, /^Conta vencida há/)
  })

  it('shows Pagar na conta when reimbursement received and not overdue', () => {
    const tx = {
      status: 'pending',
      date: dayjs().startOf('day').toISOString(),
    }
    const badges = getPayableStatusBadges(tx, { reimbursementReceived: true })
    assert.equal(badges[0].key, 'upcoming')
    assert.equal(badges[0].label, 'Pagar conta hoje')
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
