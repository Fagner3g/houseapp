import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.DB_PASSWORD = 'test'
  process.env.JWT_SECRET = 'test-secret'
  process.env.WEB_URL = 'http://localhost:3000'
})

import type { AccountRepository } from '@/modules/accounts/account.repository'
import type { CategoryRepository } from '@/modules/categories/category.repository'
import type { SplitService } from '@/modules/splits/split.service'
import type { TransactionRepository } from '@/modules/transactions/transaction.repository'
import { TransactionService } from '@/modules/transactions/transaction.service'

describe('TransactionService manual credit card create guard', () => {
  it('rejects manual create on credit_card accounts', async () => {
    const transactionRepository = {
      create: vi.fn(),
      createMany: vi.fn(),
    } as unknown as TransactionRepository

    const accountRepository = {
      findById: vi.fn().mockResolvedValue({
        id: 'acc-card',
        type: 'credit_card',
        isActive: true,
        closingDay: 1,
        dueDay: 10,
      }),
    } as unknown as AccountRepository

    const service = new TransactionService(
      transactionRepository,
      accountRepository,
      {} as CategoryRepository,
      {} as SplitService
    )

    await expect(
      service.create('org-1', {
        title: 'Manual purchase',
        amount: '10.00',
        type: 'expense',
        date: new Date().toISOString(),
        accountId: 'acc-card',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    })

    expect(transactionRepository.create).not.toHaveBeenCalled()
  })

  it('allows import source on credit_card accounts', async () => {
    const created = {
      id: 'tx-1',
      organizationId: 'org-1',
      accountId: 'acc-card',
      cardId: null,
      recurringTransactionId: null,
      statementId: 'stmt-1',
      title: 'Imported purchase',
      description: null,
      amount: 1000n,
      type: 'expense' as const,
      date: new Date(),
      competenceDate: new Date(),
      status: 'pending' as const,
      paidAt: null,
      paidAmount: null,
      counterparty: null,
      installmentNumber: null,
      installmentsTotal: null,
      source: 'import' as const,
      externalId: 'ext-1',
      transferPairId: null,
      notifyEnabled: false,
      notifyTargetType: null,
      notifyUserId: null,
      notifyContactName: null,
      notifyContactPhone: null,
      notifyDaysBefore: null,
      notifyLastNotifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const transactionRepository = {
      create: vi.fn().mockResolvedValue(created),
      getCategoryIds: vi.fn().mockResolvedValue(new Map()),
    } as unknown as TransactionRepository

    const accountRepository = {
      findById: vi.fn().mockResolvedValue({
        id: 'acc-card',
        type: 'credit_card',
        isActive: true,
      }),
    } as unknown as AccountRepository

    const service = new TransactionService(
      transactionRepository,
      accountRepository,
      {} as CategoryRepository,
      {} as SplitService
    )

    const result = await service.create('org-1', {
      title: 'Imported purchase',
      amount: '10.00',
      type: 'expense',
      date: new Date().toISOString(),
      accountId: 'acc-card',
      source: 'import',
      statementId: 'stmt-1',
      externalId: 'ext-1',
    })

    expect(result.transaction.id).toBe('tx-1')
    expect(transactionRepository.create).toHaveBeenCalled()
  })
})
