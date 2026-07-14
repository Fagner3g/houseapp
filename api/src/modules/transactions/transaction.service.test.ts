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

function buildService(deps: {
  transactionRepository: TransactionRepository
  accountRepository: AccountRepository
  categoryRepository?: CategoryRepository
  splitService?: SplitService
  statementRepository?: StatementRepository
}) {
  return new TransactionService(
    deps.transactionRepository,
    deps.accountRepository,
    deps.categoryRepository ?? ({} as CategoryRepository),
    deps.splitService ?? ({} as SplitService),
    deps.statementRepository ??
      ({
        hasAnyForAccount: vi.fn().mockResolvedValue(false),
      } as unknown as StatementRepository)
  )
}

const creditCardAccount = {
  id: 'acc-card',
  type: 'credit_card' as const,
  isActive: true,
  closingDay: 1,
  dueDay: 10,
}

describe('TransactionService manual credit card create guard', () => {
  it('rejects manual create on credit_card accounts with imported statements', async () => {
    const transactionRepository = {
      create: vi.fn(),
      createMany: vi.fn(),
    } as unknown as TransactionRepository

    const accountRepository = {
      findById: vi.fn().mockResolvedValue(creditCardAccount),
    } as unknown as AccountRepository

    const statementRepository = {
      hasAnyForAccount: vi.fn().mockResolvedValue(true),
    } as unknown as StatementRepository

    const service = buildService({
      transactionRepository,
      accountRepository,
      statementRepository,
    })

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

  it('allows manual create on credit_card accounts without imported statements', async () => {
    const created = {
      id: 'tx-manual',
      organizationId: 'org-1',
      accountId: 'acc-card',
      cardId: null,
      recurringTransactionId: null,
      statementId: null,
      title: 'Manual purchase',
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
      source: 'manual' as const,
      externalId: null,
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
      findById: vi.fn().mockResolvedValue(creditCardAccount),
    } as unknown as AccountRepository

    const statementRepository = {
      hasAnyForAccount: vi.fn().mockResolvedValue(false),
    } as unknown as StatementRepository

    const service = buildService({
      transactionRepository,
      accountRepository,
      statementRepository,
    })

    const result = await service.create('org-1', {
      title: 'Manual purchase',
      amount: '10.00',
      type: 'expense',
      date: new Date().toISOString(),
      accountId: 'acc-card',
    })

    expect(result.transaction.id).toBe('tx-manual')
    expect(transactionRepository.create).toHaveBeenCalled()
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
      findById: vi.fn().mockResolvedValue(creditCardAccount),
    } as unknown as AccountRepository

    const service = buildService({
      transactionRepository,
      accountRepository,
    })

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

describe('TransactionService update on credit_card', () => {
  it('allows update category on imported credit_card transaction', async () => {
    const existing = {
      id: 'tx-imported',
      organizationId: 'org-1',
      accountId: 'acc-card',
      cardId: null,
      recurringTransactionId: null,
      statementId: 'stmt-1',
      title: '99*',
      description: null,
      amount: 765n,
      type: 'expense' as const,
      date: new Date('2025-06-27'),
      competenceDate: new Date('2025-06-27'),
      status: 'pending' as const,
      paidAt: null,
      paidAmount: null,
      counterparty: null,
      installmentNumber: null,
      installmentsTotal: null,
      source: 'import' as const,
      externalId: 'ext-99',
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

    const updated = { ...existing, updatedAt: new Date() }

    const transactionRepository = {
      findById: vi.fn().mockResolvedValue(existing),
      update: vi.fn().mockResolvedValue(updated),
      getCategoryIds: vi
        .fn()
        .mockResolvedValueOnce(new Map())
        .mockResolvedValueOnce(new Map([['tx-imported', ['cat-1']]])),
    } as unknown as TransactionRepository

    const accountRepository = {
      findById: vi.fn().mockResolvedValue(creditCardAccount),
    } as unknown as AccountRepository

    const categoryRepository = {
      findById: vi.fn().mockResolvedValue({
        id: 'cat-1',
        name: 'Assinaturas',
        type: 'expense',
        isActive: true,
      }),
    } as unknown as CategoryRepository

    const statementRepository = {
      hasAnyForAccount: vi.fn().mockResolvedValue(true),
    } as unknown as StatementRepository

    const service = buildService({
      transactionRepository,
      accountRepository,
      categoryRepository,
      statementRepository,
    })

    const result = await service.update('org-1', 'tx-imported', {
      categoryIds: ['cat-1'],
    })

    expect(result.id).toBe('tx-imported')
    expect(transactionRepository.update).toHaveBeenCalled()
  })
})

describe('TransactionService pay reminder-without-value', () => {
  it('sets amount from paidAmount when occurrence has no value yet', async () => {
    const pending = {
      id: 'tx-vivo',
      organizationId: 'org-1',
      accountId: 'acc-1',
      cardId: null,
      recurringTransactionId: 'rec-1',
      statementId: null,
      title: 'Vivo',
      description: null,
      amount: null,
      type: 'expense' as const,
      date: new Date('2026-07-08T12:00:00.000Z'),
      competenceDate: null,
      status: 'pending' as const,
      paidAt: null,
      paidAmount: null,
      paymentScheduledAt: null,
      counterparty: null,
      installmentNumber: null,
      installmentsTotal: null,
      source: 'recurring' as const,
      externalId: null,
      transferPairId: null,
      notifyEnabled: false,
      notifyTargetType: null,
      notifyUserId: null,
      notifyContactName: null,
      notifyContactPhone: null,
      notifyDaysBefore: null,
      notifyOverdueConfig: null,
      notifyLastNotifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const updated = {
      ...pending,
      amount: 8990n,
      paidAmount: 8990n,
      status: 'paid' as const,
      paidAt: new Date('2026-07-11T12:00:00.000Z'),
    }

    const transactionRepository = {
      findById: vi.fn().mockResolvedValue(pending),
      update: vi.fn().mockResolvedValue(updated),
      getCategoryIds: vi.fn().mockResolvedValue(new Map()),
    } as unknown as TransactionRepository

    const service = buildService({
      transactionRepository,
      accountRepository: { findById: vi.fn() } as unknown as AccountRepository,
    })

    const result = await service.pay('org-1', 'tx-vivo', {
      paidAmount: '89.90',
      paidAt: '2026-07-11',
    })

    expect(transactionRepository.update).toHaveBeenCalledWith(
      'tx-vivo',
      expect.objectContaining({
        amount: 8990n,
        paidAmount: 8990n,
        status: 'paid',
      })
    )
    expect(result.amount).toBe('89.90')
    expect(result.status).toBe('paid')
  })
})
