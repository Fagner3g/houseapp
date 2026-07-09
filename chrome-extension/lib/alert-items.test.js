/**
 * Run: node chrome-extension/lib/alert-items.test.js
 */
const assert = require('node:assert/strict')

globalThis.self = globalThis
require('./notification-utils.js')
require('./alert-items.js')

const { buildOrgAlertItems, computeDueTiming, yesterdayEndIso } = globalThis.HouseAppAlertItems

const orgs = [{ id: 'org1', slug: 'casa', name: 'Casa Silva' }]

assert.equal(computeDueTiming('2026-07-05T12:00:00').kind, 'overdue')
assert.ok(computeDueTiming('2026-07-05T12:00:00').overdueDays >= 1)
assert.equal(computeDueTiming('2026-07-12T12:00:00').kind, 'upcoming')
assert.ok(computeDueTiming('2026-07-12T12:00:00').daysUntilDue >= 1)

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

const withNotification = buildOrgAlertItems({
  overdueTransactions: [
    { id: 'tx1', title: 'Conta', amount: '50.00', date: '2026-07-05T00:00:00.000Z' },
  ],
  upcomingTransactions: [],
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

assert.match(yesterdayEndIso(), /T\d{2}:\d{2}:\d{2}/)

console.log('alert-items.test.js: all passed')
