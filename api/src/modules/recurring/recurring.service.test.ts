import { describe, expect, it, vi } from 'vitest'

import type { AccountRepository } from '@/modules/accounts/account.repository'
import type { CategoryRepository } from '@/modules/categories/category.repository'
import type {
  TransactionRecord,
  TransactionRepository,
} from '@/modules/transactions/transaction.repository'

import type { RecurringRecord, RecurringRepository } from './recurring.repository'
import { RecurringService } from './recurring.service'

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0)
  )
}

function makeRecurring(overrides: Partial<RecurringRecord> = {}): RecurringRecord {
  return {
    id: 'rec-1',
    organizationId: 'org-1',
    accountId: 'acc-checking',
    title: 'Salary',
    amount: 1000n,
    type: 'income',
    counterparty: 'Employer',
    categoryId: 'cat-1',
    frequency: 'monthly',
    interval: 1,
    startDate: new Date('2026-08-16T00:00:00.000Z'),
    endDate: null,
    installmentsTotal: null,
    isActive: true,
    lastGeneratedDate: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  }
}

function makeTransaction(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: 'tx-1',
    organizationId: 'org-1',
    accountId: 'acc-checking',
    cardId: null,
    recurringTransactionId: 'rec-1',
    statementId: null,
    title: 'Salary',
    description: null,
    amount: 1000n,
    type: 'income',
    date: new Date('2026-07-16T00:00:00.000Z'),
    competenceDate: new Date('2026-07-16T00:00:00.000Z'),
    status: 'paid',
    paidAt: new Date('2026-07-16T00:00:00.000Z'),
    paidAmount: 1000n,
    counterparty: 'Employer',
    installmentNumber: null,
    installmentsTotal: null,
    source: 'recurring',
    externalId: null,
    transferPairId: null,
    notifyEnabled: false,
    notifyTargetType: null,
    notifyUserId: null,
    notifyContactName: null,
    notifyContactPhone: null,
    notifyDaysBefore: null,
    notifyLastNotifiedAt: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  }
}

function buildService(deps: {
  recurringRepository: Partial<RecurringRepository>
  transactionRepository: Partial<TransactionRepository>
  accountRepository?: Partial<AccountRepository>
  categoryRepository?: Partial<CategoryRepository>
}) {
  return new RecurringService(
    deps.recurringRepository as RecurringRepository,
    deps.transactionRepository as TransactionRepository,
    (deps.accountRepository ?? {
      findById: vi.fn().mockResolvedValue({
        id: 'acc-checking',
        type: 'checking',
        isActive: true,
      }),
    }) as AccountRepository,
    (deps.categoryRepository ?? {
      findById: vi.fn().mockResolvedValue({ id: 'cat-1', isActive: true }),
    }) as CategoryRepository
  )
}

describe('RecurringService', () => {
  it('materializes the first occurrence immediately on create even when start_date is in the future', async () => {
    const created = makeRecurring({
      startDate: new Date('2026-08-16T00:00:00.000Z'),
    })

    const createMany = vi.fn().mockResolvedValue([])
    const update = vi.fn().mockResolvedValue({
      ...created,
      lastGeneratedDate: created.startDate,
    })

    const service = buildService({
      recurringRepository: {
        create: vi.fn().mockResolvedValue(created),
        findById: vi.fn().mockResolvedValue({
          ...created,
          lastGeneratedDate: created.startDate,
        }),
        update,
      },
      transactionRepository: {
        createMany,
      },
    })

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-11T12:00:00.000Z'))

    const result = await service.create('org-1', {
      title: 'Salary',
      amount: '10.00',
      type: 'income',
      accountId: 'acc-checking',
      categoryId: 'cat-1',
      frequency: 'monthly',
      startDate: created.startDate.toISOString(),
    })

    expect(createMany).toHaveBeenCalledTimes(1)
    const createdRows = createMany.mock.calls[0]?.[0] ?? []
    expect(createdRows).toHaveLength(1)
    const createdRow = createdRows[0]
    expect(createdRow).toMatchObject({
      status: 'pending',
      source: 'recurring',
    })
    expect(startOfDay(createdRow.date).getTime()).toBe(
      startOfDay(created.startDate).getTime()
    )
    expect(result.materializedCount).toBe(1)
    expect(result.nextOccurrenceDate).toBeTruthy()

    vi.useRealTimers()
  })

  it('catches up all due occurrences through today when start_date is in the past', async () => {
    const created = makeRecurring({
      title: 'PBH',
      amount: 42111n,
      type: 'expense',
      startDate: new Date('2026-05-10T00:00:00.000Z'),
      installmentsTotal: 4,
    })

    const createMany = vi.fn().mockResolvedValue([])
    const update = vi.fn().mockResolvedValue({
      ...created,
      lastGeneratedDate: new Date('2026-07-10T00:00:00.000Z'),
    })

    const service = buildService({
      recurringRepository: {
        create: vi.fn().mockResolvedValue(created),
        findById: vi.fn().mockResolvedValue({
          ...created,
          lastGeneratedDate: new Date('2026-07-10T00:00:00.000Z'),
        }),
        update,
      },
      transactionRepository: {
        createMany,
      },
    })

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-11T15:00:00.000Z'))

    const result = await service.create('org-1', {
      title: 'PBH',
      amount: '421.11',
      type: 'expense',
      accountId: 'acc-checking',
      categoryId: 'cat-1',
      frequency: 'monthly',
      startDate: created.startDate.toISOString(),
      installmentsTotal: 4,
    })

    const createdRows = createMany.mock.calls[0]?.[0] ?? []
    expect(createdRows).toHaveLength(3)
    expect(createdRows.map((row: { installmentNumber: number | null }) => row.installmentNumber)).toEqual([
      1, 2, 3,
    ])
    expect(
      createdRows.map((row: { date: Date }) => startOfDay(row.date).toISOString().slice(0, 10))
    ).toEqual(['2026-05-10', '2026-06-10', '2026-07-10'])
    expect(result.materializedCount).toBe(3)

    vi.useRealTimers()
  })

  it('rejects create on credit_card accounts', async () => {
    const service = buildService({
      recurringRepository: {
        create: vi.fn(),
      },
      transactionRepository: {},
      accountRepository: {
        findById: vi.fn().mockResolvedValue({
          id: 'acc-card',
          type: 'credit_card',
          isActive: true,
        }),
      },
    })

    await expect(
      service.create('org-1', {
        title: 'Subscription',
        amount: '10.00',
        type: 'expense',
        accountId: 'acc-card',
        frequency: 'monthly',
        startDate: new Date().toISOString(),
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('updates future pending transactions while preserving paid past occurrences', async () => {
    const existing = makeRecurring({
      amount: 1000n,
      lastGeneratedDate: new Date('2026-08-16T00:00:00.000Z'),
    })

    const paidPast = makeTransaction({
      id: 'tx-paid',
      date: new Date('2026-07-16T00:00:00.000Z'),
      amount: 1000n,
      status: 'paid',
    })
    const pendingFuture = makeTransaction({
      id: 'tx-future',
      date: new Date('2026-09-16T00:00:00.000Z'),
      amount: 1000n,
      status: 'pending',
    })

    const updatePendingFromDate = vi.fn().mockResolvedValue(1)
    const update = vi.fn().mockResolvedValue({
      ...existing,
      amount: 2000n,
    })

    const service = buildService({
      recurringRepository: {
        findById: vi.fn().mockResolvedValue(existing),
        update,
      },
      transactionRepository: {
        findByRecurringId: vi.fn().mockResolvedValue([paidPast, pendingFuture]),
        updatePendingFromDate,
      },
    })

    const effectiveFrom = new Date('2026-08-01T00:00:00.000Z').toISOString()

    const preview = await service.previewUpdate('org-1', 'rec-1', {
      amount: '20.00',
      effectiveFrom,
    })

    expect(preview.impact.preservedPastCount).toBe(1)
    expect(preview.impact.updatedFuturePendingCount).toBe(1)

    await service.update('org-1', 'rec-1', {
      amount: '20.00',
      effectiveFrom,
    })

    expect(updatePendingFromDate).toHaveBeenCalledWith(
      'org-1',
      'rec-1',
      expect.any(Date),
      expect.objectContaining({ amount: 2000n })
    )
  })

  it('does not duplicate the first occurrence when the nightly job runs after create materialization', async () => {
    const row = makeRecurring({
      startDate: new Date('2026-07-16T00:00:00.000Z'),
      lastGeneratedDate: new Date('2026-07-16T00:00:00.000Z'),
    })

    const createMany = vi.fn().mockResolvedValue([])
    const update = vi.fn().mockResolvedValue(row)

    const service = buildService({
      recurringRepository: {
        update,
      },
      transactionRepository: {
        createMany,
      },
    })

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-16T12:00:00.000Z'))

    const generated = await service.materializeOne(row, {
      horizonDate: new Date('2026-07-16T00:00:00.000Z'),
    })

    expect(generated).toBe(0)
    expect(createMany).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('materializes reminder-without-value (amount 0) as null on occurrences', async () => {
    const row = makeRecurring({
      amount: 0n,
      startDate: new Date('2026-07-16T00:00:00.000Z'),
      lastGeneratedDate: null,
    })

    const createMany = vi.fn().mockResolvedValue([])
    const update = vi.fn().mockResolvedValue(row)

    const service = buildService({
      recurringRepository: { update },
      transactionRepository: { createMany },
    })

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-16T12:00:00.000Z'))

    const generated = await service.materializeOne(row, {
      horizonDate: new Date('2026-07-16T00:00:00.000Z'),
    })

    expect(generated).toBe(1)
    const createdRows = createMany.mock.calls[0]?.[0] ?? []
    expect(createdRows[0]).toMatchObject({ amount: null, title: row.title })

    vi.useRealTimers()
  })
})
