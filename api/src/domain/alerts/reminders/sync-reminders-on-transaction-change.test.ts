import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

function mockSelectWhere(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function mockSelectLimit(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function mockUpdateWhere() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }
}

function mockDeleteWhere() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  }
}

function buildCompletedReminder() {
  const dueDate = new Date(2026, 5, 15)
  return {
    id: 'rem-1',
    organizationId: 'org-1',
    createdBy: 'user-1',
    title: 'Pagar cartão',
    notes: null,
    amountCents: 10000n,
    daysBefore: [1, 0],
    useOrgAlertDefaults: true,
    overdueAlertFrequency: null,
    overdueAlertInterval: 1,
    channels: ['in_app'],
    recipientUserId: 'user-1',
    dueDate,
    isRecurring: false,
    recurrenceType: null,
    recurrenceInterval: 1,
    recurrenceUntil: null,
    notifyHour: null,
    notifyMinute: null,
    linkedSeriesId: null,
    completedAt: dueDate,
    lastCompletedPeriodKey: '2026-06',
    active: false,
    snoozedUntil: null,
    generatesTransaction: true,
    defaultPayToId: 'user-2',
    transactionType: 'expense' as const,
    createdAt: dueDate,
    updatedAt: dueDate,
  }
}

describe('revertRemindersLinkedToDeletedSeries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reactivates reminder and removes occurrence links when series is deleted', async () => {
    const reminder = buildCompletedReminder()
    const { db } = await import('@/db')

    vi.mocked(db.select).mockReturnValueOnce(
      mockSelectWhere([
        {
          id: 'link-1',
          reminderId: 'rem-1',
          periodKey: '2026-06',
          occurrenceId: 'occ-1',
          seriesId: 'series-1',
        },
      ]) as never
    )
    vi.mocked(db.select).mockReturnValueOnce(mockSelectLimit([reminder]) as never)
    vi.mocked(db.update).mockReturnValue(mockUpdateWhere() as never)
    vi.mocked(db.delete).mockReturnValue(mockDeleteWhere() as never)

    const { revertRemindersLinkedToDeletedSeries } = await import(
      './sync-reminders-on-transaction-change'
    )

    await revertRemindersLinkedToDeletedSeries(['series-1'])

    expect(db.update).toHaveBeenCalled()
    expect(db.delete).toHaveBeenCalled()
  })
})

describe('syncRemindersForOccurrenceDueDateChange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reactivates completed reminder and syncs due date when occurrence due date changes', async () => {
    const reminder = buildCompletedReminder()
    const { db } = await import('@/db')

    vi.mocked(db.select).mockReturnValueOnce(
      mockSelectWhere([
        {
          id: 'link-1',
          reminderId: 'rem-1',
          periodKey: '2026-06',
          occurrenceId: 'occ-1',
          seriesId: 'series-1',
        },
      ]) as never
    )
    vi.mocked(db.select).mockReturnValueOnce(mockSelectLimit([reminder]) as never)
    vi.mocked(db.select).mockReturnValueOnce(mockSelectWhere([]) as never)
    vi.mocked(db.update).mockReturnValue(mockUpdateWhere() as never)

    const { syncRemindersForOccurrenceDueDateChange } = await import(
      './sync-reminders-on-transaction-change'
    )

    await syncRemindersForOccurrenceDueDateChange(
      'occ-1',
      'series-1',
      new Date(2026, 5, 20)
    )

    expect(db.update).toHaveBeenCalled()
  })
})
