/**
 * Run: node chrome-extension/reminder-display.test.js
 *
 * Manual QA checklist (extension popup):
 * 1. Complete a reminder on web → reopen popup → LEMBRETES must not list it
 * 2. Complete with transaction on web → TRANSBORDO shows new tx; LEMBRETES hides period
 * 3. Monthly recurring overdue → complete period → only next period shows (if due)
 * 4. Keep popup open, complete on web → popup refreshes within poll interval / on focus
 */
const assert = require('node:assert/strict')

globalThis.self = globalThis
require('./reminder-display.js')

const {
  getReminderCalendarSpans,
  filterPendingRemindersForMonth,
  isReminderOccurrenceCompleted,
} = ReminderDisplay

const JUNE_FROM = '2026-06-01'
const JUNE_TO = '2026-06-30'
const REFERENCE = new Date('2026-06-12T12:00:00')

function mockReminder(overrides = {}) {
  return {
    id: 'rem-1',
    title: 'Pagar cartão',
    dueDate: '2026-05-10T12:00:00.000Z',
    amountCents: 10,
    active: true,
    completedAt: null,
    isRecurring: true,
    recurrenceType: 'monthly',
    recurrenceInterval: 1,
    recurrenceUntil: null,
    lastCompletedPeriodKey: null,
    snoozedUntil: null,
    ...overrides,
  }
}

// May transbordo visible before completion
const overdue = mockReminder()
assert.equal(
  getReminderCalendarSpans(overdue, JUNE_FROM, JUNE_TO, REFERENCE).length,
  1
)

// After completing May period (dueDate advanced to June)
const mayCompleted = mockReminder({ dueDate: '2026-06-10T12:00:00.000Z' })
assert.equal(
  getReminderCalendarSpans(mayCompleted, JUNE_FROM, JUNE_TO, REFERENCE).length,
  1
)
assert.equal(
  isReminderOccurrenceCompleted(mayCompleted, '2026-05-10'),
  true
)

// After completing June period (dueDate advanced to July)
const juneCompleted = mockReminder({ dueDate: '2026-07-10T12:00:00.000Z' })
assert.equal(
  filterPendingRemindersForMonth([juneCompleted], 2026, 6, REFERENCE).length,
  0
)

// One-shot completed must not appear
const oneShotDone = mockReminder({
  isRecurring: false,
  recurrenceType: null,
  dueDate: '2026-06-10T12:00:00.000Z',
  completedAt: '2026-06-12T12:00:00.000Z',
  active: false,
})
assert.equal(
  filterPendingRemindersForMonth([oneShotDone], 2026, 6, REFERENCE).length,
  0
)

// Period key completion without dueDate advance (end-of-series shape)
const periodKeyDone = mockReminder({
  dueDate: '2026-06-10T12:00:00.000Z',
  lastCompletedPeriodKey: '2026-06',
  completedAt: '2026-06-12T12:00:00.000Z',
  active: false,
})
assert.equal(
  isReminderOccurrenceCompleted(periodKeyDone, '2026-06-10'),
  true
)

console.log('reminder-display.test.js: all assertions passed')
