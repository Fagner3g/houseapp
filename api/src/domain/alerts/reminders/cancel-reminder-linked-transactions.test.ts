import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BadRequestError } from '@/http/utils/error'

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
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

function mockSelectWhere(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
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

describe('cancelReminderLinkedTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cancels pending linked occurrence and deactivates series', async () => {
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
    vi.mocked(db.select).mockReturnValueOnce(mockSelectLimit([{ status: 'pending' }]) as never)
    vi.mocked(db.update).mockReturnValue(mockUpdateWhere() as never)
    vi.mocked(db.delete).mockReturnValue(mockDeleteWhere() as never)

    const { cancelReminderLinkedTransactions } = await import('./cancel-reminder-linked-transactions')

    const result = await cancelReminderLinkedTransactions('rem-1', { periodKey: '2026-06' })

    expect(result.canceledOccurrenceIds).toEqual(['occ-1'])
    expect(db.update).toHaveBeenCalledTimes(2)
    expect(db.delete).toHaveBeenCalledTimes(1)
  })

  it('blocks when linked occurrence is paid and blockIfPaid is true', async () => {
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
    vi.mocked(db.select).mockReturnValueOnce(mockSelectLimit([{ status: 'paid' }]) as never)

    const { cancelReminderLinkedTransactions } = await import('./cancel-reminder-linked-transactions')

    await expect(
      cancelReminderLinkedTransactions('rem-1', { periodKey: '2026-06', blockIfPaid: true })
    ).rejects.toThrow(BadRequestError)

    expect(db.update).not.toHaveBeenCalled()
    expect(db.delete).not.toHaveBeenCalled()
  })

  it('skips paid linked occurrence on delete-style cancellation', async () => {
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
    vi.mocked(db.select).mockReturnValueOnce(mockSelectLimit([{ status: 'paid' }]) as never)

    const { cancelReminderLinkedTransactions } = await import('./cancel-reminder-linked-transactions')

    const result = await cancelReminderLinkedTransactions('rem-1')

    expect(result.canceledOccurrenceIds).toEqual([])
    expect(db.update).not.toHaveBeenCalled()
    expect(db.delete).not.toHaveBeenCalled()
  })
})
