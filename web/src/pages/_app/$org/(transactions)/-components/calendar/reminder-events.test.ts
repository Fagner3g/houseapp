import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'

import type { Reminder } from '@/features/alerts/api'

import {
  getReminderCalendarSpans,
  getReminderOccurrenceDatesInRange,
  reminderToCalendarEvents,
} from './reminder-events'

const JUNE_FROM = '2026-06-01'
const JUNE_TO = '2026-06-30'
const REFERENCE = new Date('2026-06-11T12:00:00')

function mockReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'rem-1',
    organizationId: 'org-1',
    createdBy: 'user-1',
    title: 'IPTU',
    notes: null,
    dueDate: '2026-05-15T12:00:00.000Z',
    amountCents: 150000,
    daysBefore: [7, 1, 0],
    channels: ['in_app'],
    recipientUserId: 'user-1',
    recipientName: 'Fagner',
    active: true,
    completedAt: null,
    isRecurring: false,
    recurrenceType: null,
    recurrenceInterval: 1,
    recurrenceUntil: null,
    notifyHour: null,
    notifyMinute: null,
    linkedSeriesId: null,
    snoozedUntil: null,
    lastCompletedPeriodKey: null,
    generatesTransaction: false,
    defaultPayToId: null,
    transactionType: 'expense',
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
    ...overrides,
  }
}

describe('getReminderOccurrenceDatesInRange', () => {
  it('does not include May due date when viewing June', () => {
    const reminder = mockReminder()
    expect(getReminderOccurrenceDatesInRange(reminder, JUNE_FROM, JUNE_TO)).toEqual([])
  })
})

describe('reminder transbordo roll', () => {
  it('rolls May 15 overdue IPTU to June 15 when viewing June', () => {
    const reminder = mockReminder({ title: 'IPTU', dueDate: '2026-05-15T12:00:00.000Z' })

    const spans = getReminderCalendarSpans(reminder, JUNE_FROM, JUNE_TO, REFERENCE)
    expect(spans).toHaveLength(1)
    expect(spans[0]).toEqual({
      occurrenceDateKey: '2026-05-15',
      displayKey: '2026-06-15',
      isTransbordoRepositioned: true,
    })

    const events = reminderToCalendarEvents(reminder, JUNE_FROM, JUNE_TO, REFERENCE)
    expect(events).toHaveLength(1)
    expect(events[0]?.start).toEqual(dayjs('2026-06-15').toDate())
    expect(events[0]?.isTransbordo).toBe(true)
    expect(events[0]?.overdueDays).toBeGreaterThan(0)
    expect(events[0]?.statusLine).toBe('27d · Vencido · Transbordo')
    expect(events[0]?.id).toBe('reminder:rem-1:2026-05-15')
  })

  it('does not transbordo when reminder is completed', () => {
    const reminder = mockReminder({
      dueDate: '2026-05-15T12:00:00.000Z',
      completedAt: '2026-05-20T12:00:00.000Z',
      active: false,
    })

    expect(getReminderCalendarSpans(reminder, JUNE_FROM, JUNE_TO, REFERENCE)).toEqual([])
    expect(reminderToCalendarEvents(reminder, JUNE_FROM, JUNE_TO, REFERENCE)).toEqual([])
  })

  it('shows May occurrence on May calendar without transbordo', () => {
    const reminder = mockReminder({ dueDate: '2026-05-15T12:00:00.000Z' })
    const mayFrom = '2026-05-01'
    const mayTo = '2026-05-31'
    const mayReference = new Date('2026-05-20T12:00:00')

    const events = reminderToCalendarEvents(reminder, mayFrom, mayTo, mayReference)
    expect(events).toHaveLength(1)
    expect(events[0]?.start).toEqual(dayjs('2026-05-15').toDate())
    expect(events[0]?.isTransbordo).toBe(false)
    expect(events[0]?.statusLine).toBe('5d · Lembrete')
  })

  it('does not show future recurrence while current monthly period is overdue', () => {
    const reminder = mockReminder({
      isRecurring: true,
      recurrenceType: 'monthly',
      recurrenceInterval: 1,
      dueDate: '2026-05-15T12:00:00.000Z',
    })

    const spans = getReminderCalendarSpans(reminder, JUNE_FROM, JUNE_TO, REFERENCE)
    expect(spans).toHaveLength(1)
    expect(spans[0]?.occurrenceDateKey).toBe('2026-05-15')
    expect(spans[0]?.displayKey).toBe('2026-06-15')
  })

  it('shows yearly recurrence in due month after completing previous period', () => {
    const reminder = mockReminder({
      isRecurring: true,
      recurrenceType: 'yearly',
      recurrenceInterval: 1,
      dueDate: '2027-05-15T12:00:00.000Z',
      lastCompletedPeriodKey: '2026',
    })

    expect(getReminderOccurrenceDatesInRange(reminder, '2027-05-01', '2027-05-31')).toEqual([
      '2027-05-15',
    ])
  })
})
