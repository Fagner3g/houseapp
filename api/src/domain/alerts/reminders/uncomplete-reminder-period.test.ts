import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BadRequestError } from '@/http/utils/error'

const cancelReminderLinkedTransactions = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}))

vi.mock('./cancel-reminder-linked-transactions', () => ({
  cancelReminderLinkedTransactions,
}))

function mockSelectLimit(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function mockUpdateReturning(result: unknown[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
    }),
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
    lastCompletedPeriodKey: null,
    active: false,
    snoozedUntil: null,
    generatesTransaction: true,
    defaultPayToId: 'user-2',
    transactionType: 'expense' as const,
    createdAt: dueDate,
    updatedAt: dueDate,
  }
}

describe('uncompleteReminderPeriodService linked transaction guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cancelReminderLinkedTransactions.mockResolvedValue({ canceledOccurrenceIds: ['occ-1'] })
  })

  async function mockTransaction() {
    const { db } = await import('@/db')
    vi.mocked(db.transaction).mockImplementation(async callback => callback(db as never))
  }

  it('blocks uncomplete when linked occurrence is paid', async () => {
    const reminder = buildCompletedReminder()
    const { db } = await import('@/db')

    vi.mocked(db.select).mockReturnValueOnce(mockSelectLimit([reminder]) as never)
    await mockTransaction()
    cancelReminderLinkedTransactions.mockRejectedValueOnce(
      new BadRequestError(
        'Não é possível desmarcar o lembrete pois a transação vinculada já foi paga ou possui pagamento parcial'
      )
    )

    const { uncompleteReminderPeriodService } = await import('./uncomplete-reminder-period')

    await expect(
      uncompleteReminderPeriodService({
        id: reminder.id,
        orgId: reminder.organizationId,
        occurrenceDate: '2026-06-15',
      })
    ).rejects.toThrow(BadRequestError)

    expect(cancelReminderLinkedTransactions).toHaveBeenCalledWith(
      'rem-1',
      expect.objectContaining({
        periodKey: '2026-06',
        blockIfPaid: true,
      })
    )
    expect(db.update).not.toHaveBeenCalled()
  })

  it('cancels linked occurrence through shared helper', async () => {
    const reminder = buildCompletedReminder()
    const updatedReminder = {
      ...reminder,
      completedAt: null,
      active: true,
    }
    const { db } = await import('@/db')

    vi.mocked(db.select)
      .mockReturnValueOnce(mockSelectLimit([reminder]) as never)
      .mockReturnValueOnce(mockSelectLimit([{ name: 'Fagner' }]) as never)

    await mockTransaction()
    vi.mocked(db.update).mockReturnValueOnce(mockUpdateReturning([updatedReminder]) as never)

    const { uncompleteReminderPeriodService } = await import('./uncomplete-reminder-period')

    const result = await uncompleteReminderPeriodService({
      id: reminder.id,
      orgId: reminder.organizationId,
      occurrenceDate: '2026-06-15',
    })

    expect(cancelReminderLinkedTransactions).toHaveBeenCalledWith(
      'rem-1',
      expect.objectContaining({
        periodKey: '2026-06',
        blockIfPaid: true,
      })
    )
    expect(result.reminder.active).toBe(true)
    expect(result.reminder.completedAt).toBeNull()
  })
})
