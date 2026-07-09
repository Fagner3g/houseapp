/**
 * Run: node chrome-extension/lib/notification-utils.test.js
 */
const assert = require('node:assert/strict')

globalThis.self = globalThis
require('./notification-utils.js')

const {
  parseNotificationAmount,
  formatAmount,
  formatStatusLabel,
  statusBadgeClass,
  dedupeNotifications,
  processPendingNotifications,
  countByKind,
  resolveAlertKind,
} = globalThis.HouseAppNotify

// amount in reais string (API format)
assert.equal(parseNotificationAmount({ amount: '129.90' }).reais, 129.9)
assert.equal(parseNotificationAmount({ amount: '129.90' }).cents, 12990)
assert.equal(formatAmount(129.9, true), 'R$ 129,90')

// amount in cents fallback
assert.equal(parseNotificationAmount({ amountCents: 35000 }).reais, 350)
assert.equal(parseNotificationAmount({ amountCents: 35000 }).hasAmount, true)

// unknown amount
assert.equal(formatAmount(0, false), 'Valor a confirmar')

// kind from metadata
assert.equal(resolveAlertKind({ kind: 'overdue' }, '2026-07-20'), 'overdue')
assert.equal(resolveAlertKind({ kind: 'targeted_upcoming', daysUntilDue: 1 }, '2026-07-09'), 'upcoming')

const overdueItem = {
  kind: 'overdue',
  date: '2026-07-05T00:00:00.000Z',
  overdueDays: 3,
  daysUntilDue: null,
}
assert.match(formatStatusLabel(overdueItem), /Vencida há 3 dias/)

const upcomingItem = {
  kind: 'upcoming',
  date: '2026-07-09T00:00:00.000Z',
  daysUntilDue: 1,
  overdueDays: null,
}
assert.match(formatStatusLabel(upcomingItem), /Vence amanhã/)
assert.equal(statusBadgeClass('overdue'), 'badge-overdue')
assert.equal(statusBadgeClass('upcoming'), 'badge-upcoming')

// dedupe prefers extension channel
const deduped = dedupeNotifications([
  {
    id: '1',
    transactionId: 'tx1',
    channel: 'in_app',
    metadata: { kind: 'overdue' },
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: '2',
    transactionId: 'tx1',
    channel: 'extension',
    metadata: { kind: 'overdue' },
    createdAt: '2026-07-01T00:00:00.000Z',
  },
])
assert.equal(deduped.length, 1)
assert.equal(deduped[0].channel, 'extension')

// filters whatsapp and maps org slug
const orgs = [{ id: 'org1', slug: 'casa', name: 'Casa Silva' }]
const items = processPendingNotifications(
  [
    {
      id: 'w1',
      transactionId: 'tx2',
      organizationId: 'org1',
      channel: 'whatsapp',
      metadata: { kind: 'overdue', amount: '50.00', dueDate: '2026-07-05' },
      createdAt: '2026-07-01T00:00:00.000Z',
      title: 'WhatsApp only',
    },
    {
      id: 'e1',
      transactionId: 'tx3',
      organizationId: 'org1',
      channel: 'extension',
      metadata: { kind: 'targeted_upcoming', amount: '100.00', dueDate: '2026-07-10', daysUntilDue: 2 },
      createdAt: '2026-07-01T00:00:00.000Z',
      title: 'Internet',
    },
  ],
  orgs,
  'org1'
)
assert.equal(items.length, 1)
assert.equal(items[0].orgSlug, 'casa')
assert.equal(items[0].amountReais, 100)
assert.deepEqual(countByKind(items), { overdue: 0, upcoming: 1 })

console.log('notification-utils.test.js: all passed')
