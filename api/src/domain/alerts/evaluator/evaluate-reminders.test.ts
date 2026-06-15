import { describe, expect, it, vi, beforeEach } from 'vitest'

import { hasBlockingDedupeKey } from '../delivery/insert-alert-delivery'
import { previewReminderAlerts } from './evaluate-reminders'
import { resolveReminderAlertRule } from '../rules/resolve-reminder-alert-rule'

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

vi.mock('../delivery/insert-alert-delivery', () => ({
  hasBlockingDedupeKey: vi.fn(),
}))

vi.mock('../rules/resolve-reminder-alert-rule', () => ({
  resolveReminderAlertRule: vi.fn(),
}))

const mockedResolveRule = vi.mocked(resolveReminderAlertRule)
const mockedHasBlockingDedupe = vi.mocked(hasBlockingDedupeKey)

function mockReminderRows(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(rows),
          }),
        }),
      }),
    }),
  }
}

function buildReminderRow(overrides: Record<string, unknown> = {}) {
  const dueDate = new Date('2026-06-15T12:00:00.000Z')
  return {
    reminder: {
      id: 'rem-1',
      organizationId: 'org-1',
      createdBy: 'user-1',
      title: 'Pagar cartão',
      notes: null,
      dueDate,
      amountCents: null,
      daysBefore: [1, 0],
      useOrgAlertDefaults: true,
      overdueAlertFrequency: 'weekly',
      overdueAlertInterval: 1,
      channels: ['in_app', 'whatsapp'],
      recipientUserId: 'user-1',
      active: true,
      completedAt: null,
      isRecurring: true,
      recurrenceType: 'monthly',
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
      createdAt: dueDate,
      updatedAt: dueDate,
      ...overrides,
    },
    orgSlug: 'casa',
    orgName: 'Casa',
    orgOwnerId: 'user-1',
    defaultNotifyHour: 9,
    defaultNotifyMinute: 0,
    recipientName: 'Fagner',
    recipientPhone: '+5511999999999',
    notificationsEnabled: true,
    alertPreferences: { whatsapp: true, inApp: true, extension: true },
  }
}

describe('previewReminderAlerts skip reasons', () => {
  beforeEach(async () => {
    mockedHasBlockingDedupe.mockResolvedValue(false)
    const { db } = await import('@/db')
    vi.mocked(db.select).mockReturnValue(mockReminderRows([buildReminderRow()]) as never)
  })

  it('marks reminder as outside_schedule when daysUntilDue is not in rule daysBefore', async () => {
    mockedResolveRule.mockResolvedValue({
      id: 'rule-1',
      channels: ['in_app'],
      config: { daysBefore: [7, 1, 0] },
    } as never)

    const result = await previewReminderAlerts('org-1')

    expect(result.items).toHaveLength(0)
    expect(result.skipped).toEqual([
      expect.objectContaining({
        reminderId: 'rem-1',
        reason: 'outside_schedule',
        daysUntilDue: 3,
      }),
    ])
  })

  it('resolves alert config from reminder and matches upcoming day', async () => {
    const row = buildReminderRow({ useOrgAlertDefaults: false, daysBefore: [3, 0] })
    const { db } = await import('@/db')
    vi.mocked(db.select).mockReturnValue(mockReminderRows([row]) as never)

    mockedResolveRule.mockResolvedValue({
      id: null,
      channels: ['whatsapp'],
      config: { daysBefore: [3, 0] },
    } as never)

    const result = await previewReminderAlerts('org-1')

    expect(mockedResolveRule).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rem-1', useOrgAlertDefaults: false }),
      'upcoming'
    )
    expect(result.items).toEqual([
      expect.objectContaining({
        reminderId: 'rem-1',
        kind: 'upcoming',
        daysUntilDue: 3,
        channels: ['whatsapp'],
      }),
    ])
  })

  it('skips with already_sent when all channels were delivered', async () => {
    mockedResolveRule.mockResolvedValue({
      id: 'rule-1',
      channels: ['in_app', 'whatsapp'],
      config: { daysBefore: [3, 0] },
    } as never)
    mockedHasBlockingDedupe.mockResolvedValue(true)

    const result = await previewReminderAlerts('org-1')

    expect(result.skipped).toEqual([
      expect.objectContaining({
        reminderId: 'rem-1',
        reason: 'already_sent',
      }),
    ])
  })

  it('skips with no_rule when alert rule is missing', async () => {
    mockedResolveRule.mockResolvedValue(null)

    const result = await previewReminderAlerts('org-1')

    expect(result.skipped).toEqual([
      expect.objectContaining({
        reminderId: 'rem-1',
        reason: 'no_rule',
      }),
    ])
  })

  it('rolls forward recurring reminders with past due dates for upcoming alerts', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-08T14:00:00.000Z'))

    const { db } = await import('@/db')
    vi.mocked(db.select).mockReturnValue(
      mockReminderRows([
        buildReminderRow({
          dueDate: new Date('2026-05-10T12:00:00.000Z'),
        }),
      ]) as never
    )

    mockedResolveRule.mockResolvedValue({
      id: 'rule-1',
      channels: ['whatsapp'],
      config: { daysBefore: [2, 0] },
    } as never)

    const result = await previewReminderAlerts('org-1')

    expect(result.items).toEqual([
      expect.objectContaining({
        reminderId: 'rem-1',
        kind: 'upcoming',
        daysUntilDue: 2,
        dueDate: '2026-06-10T12:00:00.000Z',
        channels: ['whatsapp'],
      }),
    ])

    vi.useRealTimers()
  })

  it('keeps one-shot reminders on their original past due date as overdue', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-08T14:00:00.000Z'))

    const { db } = await import('@/db')
    vi.mocked(db.select).mockReturnValue(
      mockReminderRows([
        buildReminderRow({
          dueDate: new Date('2026-06-05T12:00:00.000Z'),
          isRecurring: false,
          recurrenceType: null,
        }),
      ]) as never
    )

    mockedResolveRule.mockResolvedValue({
      id: 'rule-1',
      channels: ['in_app'],
      config: { daysBefore: [7, 3, 1, 0] },
    } as never)

    const result = await previewReminderAlerts('org-1')

    expect(mockedResolveRule).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rem-1', isRecurring: false }),
      'upcoming'
    )
    expect(result.items).toEqual([
      expect.objectContaining({
        reminderId: 'rem-1',
        kind: 'overdue',
        overdueDays: 3,
        dueDate: '2026-06-05T12:00:00.000Z',
      }),
    ])

    vi.useRealTimers()
  })

  it('marks overdue reminder as outside_schedule when overdue days are not in daysBefore', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-10T12:00:00.000Z'))

    const { db } = await import('@/db')
    vi.mocked(db.select).mockReturnValue(
      mockReminderRows([
        buildReminderRow({
          dueDate: new Date('2026-06-08T12:00:00.000Z'),
          isRecurring: false,
          recurrenceType: null,
        }),
      ]) as never
    )

    mockedResolveRule.mockResolvedValue({
      id: 'rule-1',
      channels: ['in_app'],
      config: { daysBefore: [7, 3, 1, 0] },
    } as never)

    const result = await previewReminderAlerts('org-1')

    expect(result.items).toHaveLength(0)
    expect(result.skipped).toEqual([
      expect.objectContaining({
        reminderId: 'rem-1',
        reason: 'outside_schedule',
        daysUntilDue: -2,
      }),
    ])

    vi.useRealTimers()
  })

  it('matches overdue reminder on configured day milestone instead of weekly dedupe', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-09T12:00:00.000Z'))

    const { db } = await import('@/db')
    vi.mocked(db.select).mockReturnValue(
      mockReminderRows([
        buildReminderRow({
          dueDate: new Date('2026-06-08T12:00:00.000Z'),
          isRecurring: false,
          recurrenceType: null,
        }),
      ]) as never
    )

    mockedResolveRule.mockResolvedValue({
      id: 'rule-1',
      channels: ['in_app', 'whatsapp'],
      config: { daysBefore: [7, 3, 1, 0] },
    } as never)

    const result = await previewReminderAlerts('org-1')

    expect(result.items).toEqual([
      expect.objectContaining({
        reminderId: 'rem-1',
        kind: 'overdue',
        overdueDays: 1,
        channels: ['in_app', 'whatsapp'],
      }),
    ])

    vi.useRealTimers()
  })
})
