import { beforeEach, describe, expect, it, vi } from 'vitest'

const cancelReminderLinkedTransactions = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}))

vi.mock('./cancel-reminder-linked-transactions', () => ({
  cancelReminderLinkedTransactions,
}))

describe('deleteReminderService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cancelReminderLinkedTransactions.mockResolvedValue({ canceledOccurrenceIds: ['occ-1'] })
  })

  it('cancels linked transactions before deleting reminder', async () => {
    const { db } = await import('@/db')
    const trx = {
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'rem-1' }]),
        }),
      }),
    } as never)

    vi.mocked(db.transaction).mockImplementation(async callback => callback(trx as never))

    const { deleteReminderService } = await import('./delete-reminder')

    await deleteReminderService({ id: 'rem-1', orgId: 'org-1' })

    expect(cancelReminderLinkedTransactions).toHaveBeenCalledWith('rem-1', { trx })
    expect(trx.delete).toHaveBeenCalledTimes(1)
  })
})
