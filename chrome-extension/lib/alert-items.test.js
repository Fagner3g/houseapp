/**
 * Run: node chrome-extension/lib/alert-items.test.js
 */
const assert = require('node:assert/strict')

globalThis.self = globalThis
require('./notification-utils.js')
require('./alert-items.js')

const {
  buildOrgAlertItems,
  computeDueTiming,
  isFutureScheduled,
  isTransactionPartiallyPaid,
  resolveTransactionListAmountReais,
  resolveUpcomingPeriod,
  yesterdayEndIso,
} = globalThis.HouseAppAlertItems
const notify = globalThis.HouseAppNotify

const orgs = [{ id: 'org1', slug: 'casa', name: 'Casa Silva' }]

assert.equal(computeDueTiming('2026-07-05T12:00:00').kind, 'overdue')
assert.ok(computeDueTiming('2026-07-05T12:00:00').overdueDays >= 1)
assert.equal(computeDueTiming('2026-07-12T12:00:00').kind, 'upcoming')
assert.ok(computeDueTiming('2026-07-12T12:00:00').daysUntilDue >= 1)

const futureSchedule = new Date()
futureSchedule.setDate(futureSchedule.getDate() + 5)
futureSchedule.setHours(23, 59, 59, 999)

assert.equal(isFutureScheduled(futureSchedule.toISOString()), true)
assert.equal(isFutureScheduled(null), false)

const items = buildOrgAlertItems({
  overdueTransactions: [
    {
      id: 'tx-overdue',
      title: 'Internet Vivo',
      amount: '129.90',
      date: '2026-07-05T12:00:00',
    },
  ],
  upcomingTransactions: [
    {
      id: 'tx-upcoming',
      title: 'Aluguel',
      amount: '2400.00',
      date: '2026-07-12T12:00:00',
    },
  ],
  scheduledTransactions: [],
  notifications: [],
  orgs,
  orgId: 'org1',
})

assert.equal(items.length, 2)
assert.equal(items[0].kind, 'overdue')
assert.equal(items[0].transactionId, 'tx-overdue')
assert.equal(items[0].amountReais, 129.9)
assert.equal(items[0].notificationId, null)
assert.equal(items[1].kind, 'upcoming')

const scheduledItems = buildOrgAlertItems({
  overdueTransactions: [
    {
      id: 'tx-loan',
      title: 'Empréstimo mãe',
      amount: '4000.00',
      date: '2026-06-17T00:00:00.000Z',
      paymentScheduledAt: null,
    },
  ],
  upcomingTransactions: [],
  scheduledTransactions: [
    {
      id: 'tx-loan',
      title: 'Empréstimo mãe',
      amount: '4000.00',
      date: '2026-06-17T00:00:00.000Z',
      paymentScheduledAt: null,
    },
  ],
  notifications: [],
  orgs,
  orgId: 'org1',
})

assert.equal(scheduledItems.length, 1)
assert.equal(scheduledItems[0].kind, 'overdue')
assert.equal(scheduledItems[0].transactionId, 'tx-loan')

const scheduledOnlyItems = buildOrgAlertItems({
  overdueTransactions: [
    {
      id: 'tx-loan',
      title: 'Empréstimo mãe',
      amount: '4000.00',
      date: '2026-06-17T00:00:00.000Z',
      paymentScheduledAt: futureSchedule.toISOString(),
    },
  ],
  upcomingTransactions: [],
  scheduledTransactions: [
    {
      id: 'tx-loan',
      title: 'Empréstimo mãe',
      amount: '4000.00',
      date: '2026-06-17T00:00:00.000Z',
      paymentScheduledAt: futureSchedule.toISOString(),
    },
  ],
  notifications: [],
  orgs,
  orgId: 'org1',
})

assert.equal(scheduledOnlyItems.length, 1)
assert.equal(scheduledOnlyItems[0].kind, 'scheduled')
assert.equal(scheduledOnlyItems[0].transactionId, 'tx-loan')
const loanBadges = notify.getStatusBadges(scheduledOnlyItems[0])
assert.equal(loanBadges.length, 2)
assert.equal(loanBadges[0].key, 'scheduled')
assert.equal(loanBadges[1].key, 'due-date')
assert.equal(loanBadges[1].badgeClass, 'badge-due-date')
assert.match(loanBadges[1].label, /^Venc\. /)

const withNotification = buildOrgAlertItems({
  overdueTransactions: [
    { id: 'tx1', title: 'Conta', amount: '50.00', date: '2026-07-05T00:00:00.000Z' },
  ],
  upcomingTransactions: [],
  scheduledTransactions: [],
  notifications: [
    {
      id: 'n1',
      transactionId: 'tx1',
      organizationId: 'org1',
      channel: 'extension',
      title: 'Conta luz',
      metadata: { kind: 'overdue', amount: '50.00', dueDate: '2026-07-05', overdueDays: 3 },
      createdAt: '2026-07-08T00:00:00.000Z',
    },
  ],
  orgs,
  orgId: 'org1',
})

assert.equal(withNotification.length, 1)
assert.equal(withNotification[0].notificationId, 'n1')
assert.equal(withNotification[0].title, 'Conta luz')

assert.deepEqual(notify.countByKind([
  { kind: 'overdue' },
  { kind: 'scheduled' },
  { kind: 'upcoming' },
]), { overdue: 1, scheduled: 1, upcoming: 1 })

assert.equal(notify.statusBadgeClass('scheduled'), 'badge-scheduled')

assert.match(yesterdayEndIso(), /T\d{2}:\d{2}:\d{2}/)

const sevenDayRange = resolveUpcomingPeriod('7')
const from7 = new Date(sevenDayRange.dateFrom)
const to7 = new Date(sevenDayRange.dateTo)
const expectedEnd = new Date(from7)
expectedEnd.setDate(expectedEnd.getDate() + 7)
assert.equal(from7.getHours(), 0)
assert.equal(to7.getHours(), 23)
assert.equal(to7.getDate(), expectedEnd.getDate())
assert.equal(to7.getMonth(), expectedEnd.getMonth())

const monthRange = resolveUpcomingPeriod('month')
const toMonth = new Date(monthRange.dateTo)
const today = new Date()
today.setHours(0, 0, 0, 0)
const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
assert.equal(toMonth.getDate(), monthEnd.getDate())
assert.equal(toMonth.getMonth(), monthEnd.getMonth())

assert.equal(resolveTransactionListAmountReais('4000.00', '0.00', 3000), 1000)
assert.equal(isTransactionPartiallyPaid('4000.00', '0.00', 3000), true)

const partialItems = buildOrgAlertItems({
  overdueTransactions: [
    {
      id: 'tx-loan',
      title: 'Empréstimo mãe',
      amount: '4000.00',
      paidAmount: '0.00',
      status: 'pending',
      date: '2026-06-17T00:00:00.000Z',
    },
  ],
  upcomingTransactions: [],
  scheduledTransactions: [],
  notifications: [],
  orgs,
  orgId: 'org1',
  splitPaidById: new Map([['tx-loan', 3000]]),
})

assert.equal(partialItems.length, 1)
assert.equal(partialItems[0].amountReais, 1000)
assert.equal(partialItems[0].isPartiallyPaid, true)
const partialBadges = notify.getStatusBadges(partialItems[0])
assert.equal(partialBadges[0].key, 'partial')
assert.equal(partialBadges[0].label, 'Pagamento parcial')
assert.equal(partialBadges[1].key, 'overdue')

// Screenshot scenario: DAS overdue + DARF/NFE scheduled past-due → 1 vencida, 2 agendadas
const screenshotItems = buildOrgAlertItems({
  overdueTransactions: [
    {
      id: 'tx-das',
      title: 'DAS',
      amount: '100.00',
      date: '2026-07-10T00:00:00.000Z',
    },
    {
      id: 'tx-darf',
      title: 'DARF',
      amount: '200.00',
      date: '2026-07-10T00:00:00.000Z',
      paymentScheduledAt: futureSchedule.toISOString(),
    },
    {
      id: 'tx-nfe',
      title: 'NFE Sem Parar',
      amount: '300.00',
      date: '2026-07-06T00:00:00.000Z',
      paymentScheduledAt: futureSchedule.toISOString(),
    },
  ],
  upcomingTransactions: [],
  scheduledTransactions: [
    {
      id: 'tx-darf',
      title: 'DARF',
      amount: '200.00',
      date: '2026-07-10T00:00:00.000Z',
      paymentScheduledAt: futureSchedule.toISOString(),
    },
    {
      id: 'tx-nfe',
      title: 'NFE Sem Parar',
      amount: '300.00',
      date: '2026-07-06T00:00:00.000Z',
      paymentScheduledAt: futureSchedule.toISOString(),
    },
  ],
  notifications: [],
  orgs,
  orgId: 'org1',
})

assert.equal(screenshotItems.length, 3)
assert.deepEqual(notify.countByKind(screenshotItems), {
  overdue: 1,
  scheduled: 2,
  upcoming: 0,
})
assert.equal(screenshotItems.find(i => i.transactionId === 'tx-das')?.kind, 'overdue')
assert.equal(screenshotItems.find(i => i.transactionId === 'tx-darf')?.kind, 'scheduled')
assert.equal(screenshotItems.find(i => i.transactionId === 'tx-nfe')?.kind, 'scheduled')
const darfBadges = notify.getStatusBadges(screenshotItems.find(i => i.transactionId === 'tx-darf'))
assert.ok(!darfBadges.some(b => b.key === 'overdue'))
assert.ok(darfBadges.some(b => b.key === 'due-date'))

console.log('alert-items.test.js: all passed')
