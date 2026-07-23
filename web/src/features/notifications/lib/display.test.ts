import { describe, expect, it } from 'vitest'

import {
  buildNotificationDisplay,
  isInboxChannel,
  notificationTitle,
  sortInboxNotifications,
} from './display'
import { getNotificationTone, isDecisionNotification } from './kinds'

describe('notification kinds', () => {
  it('detects decision notifications', () => {
    expect(isDecisionNotification({ kind: 'split_payment_request' })).toBe(true)
    expect(isDecisionNotification({ kind: 'overdue' })).toBe(false)
  })

  it('maps tones', () => {
    expect(getNotificationTone({ kind: 'split_payment_request' })).toBe('decision')
    expect(getNotificationTone({ kind: 'invoice_overdue' })).toBe('overdue')
    expect(getNotificationTone({ kind: 'targeted_upcoming' })).toBe('upcoming')
  })
})

describe('notification display', () => {
  it('formats amount and due label instead of raw ISO body', () => {
    const display = buildNotificationDisplay({
      id: '1',
      title: 'Vencido há 5 dias: PBH',
      body: 'Valor: R$ 421.11 · Vencimento: 2026-07-10T12:00:00.000Z',
      channel: 'in_app',
      transactionId: 'tx1',
      accountId: null,
      metadata: {
        kind: 'overdue',
        amount: '421.11',
        dueDate: '2026-07-10T12:00:00.000Z',
        overdueDays: 5,
      },
      createdAt: new Date().toISOString(),
      readAt: null,
    })

    expect(display.tone).toBe('overdue')
    expect(display.amountLabel).toBe('R$\u00a0421,11')
    expect(display.dueLabel).toBe('Vencido há 5 dias')
    expect(display.subtitle).toContain('R$')
    expect(display.subtitle).not.toContain('2026-07-10T')
  })

  it('strips redundant status prefix from title', () => {
    expect(
      notificationTitle({
        id: '1',
        title: 'Vencido há 5 dias: DAS',
        body: null,
        channel: 'in_app',
        transactionId: null,
        accountId: null,
        metadata: { kind: 'overdue', overdueDays: 5 },
        createdAt: new Date().toISOString(),
        readAt: null,
      })
    ).toBe('DAS')
  })

  it('inbox shows only in_app channel', () => {
    expect(isInboxChannel('in_app')).toBe(true)
    expect(isInboxChannel('extension')).toBe(false)
    expect(isInboxChannel('whatsapp')).toBe(false)
  })

  it('sorts decision notifications first', () => {
    const sorted = sortInboxNotifications([
      {
        id: 'a',
        title: 'Overdue',
        body: null,
        channel: 'in_app',
        transactionId: null,
        accountId: null,
        metadata: { kind: 'overdue' },
        createdAt: '2026-07-15T10:00:00.000Z',
        readAt: null,
      },
      {
        id: 'b',
        title: 'Confirm',
        body: null,
        channel: 'in_app',
        transactionId: null,
        accountId: null,
        metadata: { kind: 'split_payment_request' },
        createdAt: '2026-07-15T09:00:00.000Z',
        readAt: null,
      },
    ])

    expect(sorted.map(n => n.id)).toEqual(['b', 'a'])
  })
})
