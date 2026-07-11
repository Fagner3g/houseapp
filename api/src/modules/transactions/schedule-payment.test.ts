import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.DB_PASSWORD = 'test'
  process.env.JWT_SECRET = 'test-secret'
  process.env.WEB_URL = 'http://localhost:3000'
})

import type { AccountRepository } from '@/modules/accounts/account.repository'
import type { CategoryRepository } from '@/modules/categories/category.repository'
import type { SplitService } from '@/modules/splits/split.service'
import type { StatementRepository } from '@/modules/statements/statement.repository'
import type { TransactionRepository } from '@/modules/transactions/transaction.repository'
import { TransactionService } from '@/modules/transactions/transaction.service'

import { normalizeScheduledAt } from './schedule-payment'

function buildService(transactionRepository: TransactionRepository) {
  return new TransactionService(
    transactionRepository,
    {} as AccountRepository,
    {} as CategoryRepository,
    {} as SplitService,
    {
      hasAnyForAccount: vi.fn().mockResolvedValue(false),
    } as unknown as StatementRepository
  )
}

const pendingTx = {
  id: 'tx-1',
  organizationId: 'org-1',
  status: 'pending' as const,
  paymentScheduledAt: null,
  amount: 10000n,
  paidAmount: null,
  paidAt: null,
  date: new Date('2026-07-01'),
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('normalizeScheduledAt', () => {
  it('accepts today and future dates', () => {
    const result = normalizeScheduledAt('2026-12-31T10:00:00.000Z')
    expect(result.getTime()).toBeGreaterThan(Date.now() - 86400000)
  })

  it('rejects past dates', () => {
    expect(() => normalizeScheduledAt('2020-01-01T10:00:00.000Z')).toThrow(/today or in the future/)
  })

  it('rejects yesterday relative to today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-09T12:00:00.000Z'))

    expect(() => normalizeScheduledAt('2026-07-07T12:00:00.000Z')).toThrow(/today or in the future/)

    vi.useRealTimers()
  })
})

describe('TransactionService schedule payment', () => {
  it('schedules payment on a pending transaction', async () => {
    const scheduledAt = new Date('2026-07-20T23:59:59.999Z')
    const updated = { ...pendingTx, paymentScheduledAt: scheduledAt }

    const transactionRepository = {
      findById: vi.fn().mockResolvedValue(pendingTx),
      update: vi.fn().mockResolvedValue(updated),
      getCategoryIds: vi.fn().mockResolvedValue(new Map([['tx-1', []]])),
    } as unknown as TransactionRepository

    const service = buildService(transactionRepository)
    const result = await service.schedulePayment('org-1', 'tx-1', {
      scheduledAt: '2026-07-20T12:00:00.000Z',
    })

    expect(transactionRepository.update).toHaveBeenCalledWith('tx-1', {
      paymentScheduledAt: expect.any(Date),
    })
    expect(result.paymentScheduledAt).toBeTruthy()
  })

  it('rejects schedule on paid transaction', async () => {
    const transactionRepository = {
      findById: vi.fn().mockResolvedValue({ ...pendingTx, status: 'paid' }),
    } as unknown as TransactionRepository

    const service = buildService(transactionRepository)

    await expect(
      service.schedulePayment('org-1', 'tx-1', { scheduledAt: '2026-07-20T12:00:00.000Z' })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('cancels scheduled payment', async () => {
    const scheduled = { ...pendingTx, paymentScheduledAt: new Date('2026-07-20T23:59:59.999Z') }
    const cleared = { ...pendingTx, paymentScheduledAt: null }

    const transactionRepository = {
      findById: vi.fn().mockResolvedValue(scheduled),
      update: vi.fn().mockResolvedValue(cleared),
      getCategoryIds: vi.fn().mockResolvedValue(new Map([['tx-1', []]])),
    } as unknown as TransactionRepository

    const service = buildService(transactionRepository)
    const result = await service.cancelScheduledPayment('org-1', 'tx-1')

    expect(transactionRepository.update).toHaveBeenCalledWith('tx-1', {
      paymentScheduledAt: null,
    })
    expect(result.paymentScheduledAt).toBeNull()
  })

  it('clears scheduled payment when paying', async () => {
    const scheduled = {
      ...pendingTx,
      paymentScheduledAt: new Date('2026-07-20T23:59:59.999Z'),
      title: 'Conta',
      type: 'expense' as const,
      description: null,
      accountId: 'acc-1',
      cardId: null,
      recurringTransactionId: null,
      statementId: null,
      competenceDate: null,
      counterparty: null,
      installmentNumber: null,
      installmentsTotal: null,
      source: 'manual' as const,
      transferPairId: null,
      notifyEnabled: false,
      notifyTargetType: null,
      notifyUserId: null,
      notifyContactName: null,
      notifyContactPhone: null,
      notifyDaysBefore: null,
      notifyOverdueConfig: null,
    }

    const paid = {
      ...scheduled,
      status: 'paid' as const,
      paidAmount: 10000n,
      paidAt: new Date(),
      paymentScheduledAt: null,
    }

    const transactionRepository = {
      findById: vi.fn().mockResolvedValue(scheduled),
      update: vi.fn().mockResolvedValue(paid),
      getCategoryIds: vi.fn().mockResolvedValue(new Map([['tx-1', []]])),
    } as unknown as TransactionRepository

    const service = buildService(transactionRepository)
    await service.pay('org-1', 'tx-1', { paidAmount: '100.00' })

    expect(transactionRepository.update).toHaveBeenCalledWith(
      'tx-1',
      expect.objectContaining({ paymentScheduledAt: null, status: 'paid' })
    )
  })
})
