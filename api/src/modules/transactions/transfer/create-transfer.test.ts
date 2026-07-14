import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.DB_PASSWORD = 'test'
  process.env.JWT_SECRET = 'test-secret'
  process.env.WEB_URL = 'http://localhost:3000'
})

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

import { db } from '@/db'
import type { AccountRepository } from '@/modules/accounts/account.repository'
import type { TransactionRepository } from '@/modules/transactions/transaction.repository'

import { createTransfer } from './create-transfer'

const fromOrgId = 'org-from'

function mockSelectSequence(results: unknown[][]) {
  let call = 0
  vi.mocked(db.select).mockImplementation(() => {
    const rows = results[call] ?? []
    call += 1
    const builder: {
      from: () => typeof builder
      where: () => typeof builder
      limit: () => Promise<unknown[]>
    } = {
      from: () => builder,
      where: () => builder,
      limit: async () => rows,
    }
    return builder as never
  })
}

describe('createTransfer', () => {
  it('creates a linked pair in the same organization', async () => {
    mockSelectSequence([
      [{ id: fromOrgId, name: 'Empresa', slug: 'empresa' }],
      [{ userId: 'user-1' }],
      [{ name: 'Empresa' }],
    ])

    const fromAccount = {
      id: 'acc-from',
      name: 'Corrente',
      type: 'checking' as const,
      isActive: true,
      organizationId: fromOrgId,
    }
    const toAccount = {
      id: 'acc-to',
      name: 'Poupança',
      type: 'savings' as const,
      isActive: true,
      organizationId: fromOrgId,
    }

    const accountRepository = {
      findById: vi.fn().mockResolvedValueOnce(fromAccount).mockResolvedValueOnce(toAccount),
    } as unknown as AccountRepository

    const expense = {
      id: 'tx-expense',
      organizationId: fromOrgId,
      accountId: 'acc-from',
      title: 'Transferência: Corrente → Poupança',
      description: null,
      amount: 150000n,
      type: 'expense' as const,
      date: new Date('2026-07-14T12:00:00.000Z'),
      competenceDate: null,
      status: 'paid' as const,
      paidAt: new Date('2026-07-14T12:00:00.000Z'),
      paidAmount: 150000n,
      paymentScheduledAt: null,
      cardId: null,
      recurringTransactionId: null,
      statementId: null,
      counterparty: null,
      installmentNumber: null,
      installmentsTotal: null,
      source: 'manual' as const,
      transferPairId: 'tx-income',
      notifyEnabled: false,
      notifyTargetType: null,
      notifyUserId: null,
      notifyContactName: null,
      notifyContactPhone: null,
      notifyDaysBefore: null,
      notifyOverdueConfig: null,
      notifyLastNotifiedAt: null,
      externalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const income = {
      ...expense,
      id: 'tx-income',
      type: 'income' as const,
      accountId: 'acc-to',
      transferPairId: 'tx-expense',
    }

    const createTransferPair = vi.fn().mockResolvedValue({ from: expense, to: income })
    const transactionRepository = {
      createTransferPair,
    } as unknown as TransactionRepository

    const result = await createTransfer({
      userId: 'user-1',
      fromOrganizationId: fromOrgId,
      input: {
        fromAccountId: 'acc-from',
        toOrganizationSlug: 'empresa',
        toAccountId: 'acc-to',
        amount: '1500.00',
        date: '2026-07-14T12:00:00.000Z',
      },
      transactionRepository,
      accountRepository,
    })

    expect(createTransferPair).toHaveBeenCalledOnce()
    expect(result.from.transferPairId).toBe('tx-income')
    expect(result.to.transferPairId).toBe('tx-expense')
    expect(result.from.type).toBe('expense')
    expect(result.to.type).toBe('income')
    expect(result.from.amount).toBe('1500.00')
  })

  it('rejects when destination org membership is missing', async () => {
    mockSelectSequence([[{ id: 'org-to', name: 'Casa', slug: 'casa' }], []])

    await expect(
      createTransfer({
        userId: 'user-1',
        fromOrganizationId: fromOrgId,
        input: {
          fromAccountId: 'acc-from',
          toOrganizationSlug: 'casa',
          toAccountId: 'acc-to',
          amount: '100.00',
          date: '2026-07-14T12:00:00.000Z',
        },
        transactionRepository: {} as TransactionRepository,
        accountRepository: {} as AccountRepository,
      })
    ).rejects.toThrow(/Access denied to destination organization/)
  })

  it('rejects when source and destination accounts are the same', async () => {
    mockSelectSequence([
      [{ id: fromOrgId, name: 'Empresa', slug: 'empresa' }],
      [{ userId: 'user-1' }],
    ])

    await expect(
      createTransfer({
        userId: 'user-1',
        fromOrganizationId: fromOrgId,
        input: {
          fromAccountId: 'acc-1',
          toOrganizationSlug: 'empresa',
          toAccountId: 'acc-1',
          amount: '100.00',
          date: '2026-07-14T12:00:00.000Z',
        },
        transactionRepository: {} as TransactionRepository,
        accountRepository: {} as AccountRepository,
      })
    ).rejects.toThrow(/must be different/)
  })
})
