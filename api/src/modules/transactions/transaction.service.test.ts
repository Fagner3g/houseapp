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

describe('TransactionService pay underpayment carry', () => {
  const baseTx = {
    organizationId: 'org-1',
    accountId: 'acc-1',
    cardId: null,
    recurringTransactionId: null,
    statementId: null,
    description: null,
    type: 'income' as const,
    date: new Date('2026-07-01T12:00:00.000Z'),
    competenceDate: null,
    paidAt: null,
    paymentScheduledAt: null,
    counterparty: null,
    source: 'manual' as const,
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
    createdBy: 'user-1',
  }

  it('closes current at paid amount and adds shortfall onto next parcel', async () => {
    const current = {
      ...baseTx,
      id: 'tx-1',
      title: 'Aluguel 1/3',
      amount: 40000n,
      status: 'pending' as const,
      paidAmount: null,
      installmentNumber: 1,
      installmentsTotal: 3,
    }
    const next = {
      ...baseTx,
      id: 'tx-2',
      title: 'Aluguel 2/3',
      amount: 40000n,
      status: 'pending' as const,
      paidAmount: null,
      installmentNumber: 2,
      installmentsTotal: 3,
    }
    const updatedCurrent = {
      ...current,
      amount: 25000n,
      paidAmount: 25000n,
      status: 'paid' as const,
      paidAt: new Date('2026-07-15T12:00:00.000Z'),
    }

    const transactionRepository = {
      findById: vi.fn().mockResolvedValue(current),
      update: vi
        .fn()
        .mockResolvedValueOnce(updatedCurrent)
        .mockResolvedValueOnce({ ...next, amount: 15000n }),
      getCategoryIds: vi.fn().mockResolvedValue(new Map()),
    } as unknown as TransactionRepository

    const service = buildService({
      transactionRepository,
      accountRepository: { findById: vi.fn() } as unknown as AccountRepository,
    })

    vi.spyOn(
      service as unknown as {
        repairIncompleteInstallments: () => Promise<void>
      },
      'repairIncompleteInstallments'
    ).mockResolvedValue(undefined)

    vi.spyOn(
      service as unknown as {
        findInstallmentSiblings: () => Promise<typeof current[]>
      },
      'findInstallmentSiblings'
    ).mockResolvedValue([current, next])

    const result = await service.pay('org-1', 'tx-1', { paidAmount: '250.00' })

    expect(transactionRepository.update).toHaveBeenNthCalledWith(
      1,
      'tx-1',
      expect.objectContaining({
        amount: 25000n,
        paidAmount: 25000n,
        status: 'paid',
      })
    )
    expect(transactionRepository.update).toHaveBeenNthCalledWith(
      2,
      'tx-2',
      expect.objectContaining({
        amount: 55000n,
        status: 'pending',
      })
    )
    expect(result.status).toBe('paid')
    expect(result.amount).toBe('250.00')
  })

  it('keeps classic partial when there is no next open installment', async () => {
    const last = {
      ...baseTx,
      id: 'tx-3',
      title: 'Aluguel 3/3',
      amount: 40000n,
      status: 'pending' as const,
      paidAmount: null,
      installmentNumber: 3,
      installmentsTotal: 3,
    }
    const updated = {
      ...last,
      paidAmount: 25000n,
      status: 'partial' as const,
      paidAt: new Date('2026-07-15T12:00:00.000Z'),
    }

    const transactionRepository = {
      findById: vi.fn().mockResolvedValue(last),
      update: vi.fn().mockResolvedValue(updated),
      getCategoryIds: vi.fn().mockResolvedValue(new Map()),
    } as unknown as TransactionRepository

    const service = buildService({
      transactionRepository,
      accountRepository: { findById: vi.fn() } as unknown as AccountRepository,
    })

    vi.spyOn(
      service as unknown as {
        repairIncompleteInstallments: () => Promise<void>
      },
      'repairIncompleteInstallments'
    ).mockResolvedValue(undefined)

    vi.spyOn(
      service as unknown as {
        findInstallmentSiblings: () => Promise<typeof last[]>
      },
      'findInstallmentSiblings'
    ).mockResolvedValue([last])

    await service.pay('org-1', 'tx-3', { paidAmount: '250.00' })

    expect(transactionRepository.update).toHaveBeenCalledTimes(1)
    expect(transactionRepository.update).toHaveBeenCalledWith(
      'tx-3',
      expect.objectContaining({
        paidAmount: 25000n,
        status: 'partial',
      })
    )
  })
})

describe('TransactionService pay overpayment waterfall', () => {
  const baseTx = {
    organizationId: 'org-1',
    accountId: 'acc-1',
    cardId: null,
    recurringTransactionId: null,
    statementId: null,
    description: null,
    type: 'expense' as const,
    date: new Date('2026-07-01T12:00:00.000Z'),
    competenceDate: null,
    paidAt: null,
    paymentScheduledAt: null,
    counterparty: null,
    source: 'manual' as const,
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
    createdBy: 'user-1',
  }

  it('cascades overpay onto next installment as partial', async () => {
    const current = {
      ...baseTx,
      id: 'tx-1',
      title: 'Marmori 1/3',
      amount: 28380n,
      status: 'pending' as const,
      paidAmount: null,
      installmentNumber: 1,
      installmentsTotal: 3,
    }
    const next = {
      ...baseTx,
      id: 'tx-2',
      title: 'Marmori 2/3',
      amount: 28380n,
      status: 'pending' as const,
      paidAmount: null,
      installmentNumber: 2,
      installmentsTotal: 3,
      date: new Date('2026-08-01T12:00:00.000Z'),
    }
    const third = {
      ...baseTx,
      id: 'tx-3',
      title: 'Marmori 3/3',
      amount: 28380n,
      status: 'pending' as const,
      paidAmount: null,
      installmentNumber: 3,
      installmentsTotal: 3,
      date: new Date('2026-09-01T12:00:00.000Z'),
    }
    const updatedCurrent = {
      ...current,
      paidAmount: 28380n,
      status: 'paid' as const,
      paidAt: new Date('2026-07-15T12:00:00.000Z'),
    }

    const transactionRepository = {
      findById: vi.fn().mockResolvedValue(current),
      update: vi
        .fn()
        .mockResolvedValueOnce(updatedCurrent)
        .mockResolvedValueOnce({
          ...next,
          paidAmount: 21620n,
          status: 'partial',
          paidAt: new Date('2026-07-15T12:00:00.000Z'),
        }),
      getCategoryIds: vi.fn().mockResolvedValue(new Map()),
    } as unknown as TransactionRepository

    const service = buildService({
      transactionRepository,
      accountRepository: { findById: vi.fn() } as unknown as AccountRepository,
    })

    vi.spyOn(
      service as unknown as {
        repairIncompleteInstallments: () => Promise<void>
      },
      'repairIncompleteInstallments'
    ).mockResolvedValue(undefined)

    vi.spyOn(
      service as unknown as {
        findInstallmentSiblings: () => Promise<typeof current[]>
      },
      'findInstallmentSiblings'
    ).mockResolvedValue([current, next, third])

    const result = await service.pay('org-1', 'tx-1', { paidAmount: '500.00' })

    expect(transactionRepository.update).toHaveBeenNthCalledWith(
      1,
      'tx-1',
      expect.objectContaining({
        paidAmount: 28380n,
        status: 'paid',
      })
    )
    expect(transactionRepository.update).toHaveBeenNthCalledWith(
      2,
      'tx-2',
      expect.objectContaining({
        paidAmount: 21620n,
        status: 'partial',
      })
    )
    expect(result.status).toBe('paid')
  })
})

describe('TransactionService installment date scope cascade', () => {
  const checkingAccount = {
    id: 'acc-1',
    type: 'checking' as const,
    isActive: true,
  }

  const parcel1 = {
    id: 'tx-1',
    organizationId: 'org-1',
    accountId: 'acc-1',
    cardId: null,
    recurringTransactionId: null,
    statementId: null,
    title: 'Teste - Parcela 1/3',
    description: null,
    amount: 20000n,
    type: 'income' as const,
    date: new Date('2026-06-28T12:00:00.000Z'),
    competenceDate: new Date('2026-07-07T12:00:00.000Z'),
    status: 'pending' as const,
    paidAt: null,
    paidAmount: null,
    paymentScheduledAt: null,
    counterparty: null,
    installmentNumber: 1,
    installmentsTotal: 3,
    source: 'manual' as const,
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
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const parcel2 = {
    ...parcel1,
    id: 'tx-2',
    title: 'Teste - Parcela 2/3',
    date: new Date('2026-07-28T12:00:00.000Z'),
    competenceDate: new Date('2026-08-07T12:00:00.000Z'),
    installmentNumber: 2,
  }

  const parcel3 = {
    ...parcel1,
    id: 'tx-3',
    title: 'Teste - Parcela 3/3',
    date: new Date('2026-08-28T12:00:00.000Z'),
    competenceDate: new Date('2026-09-07T12:00:00.000Z'),
    installmentNumber: 3,
  }

  function setupUpdateMocks() {
    const updatedParcel2 = {
      ...parcel2,
      date: new Date('2026-08-05T12:00:00.000Z'),
      updatedAt: new Date(),
    }

    const transactionRepository = {
      findById: vi.fn().mockResolvedValue(parcel2),
      update: vi.fn().mockImplementation(async (id: string, data: { date?: Date }) => {
        if (id === 'tx-2') return { ...updatedParcel2, ...data }
        if (id === 'tx-1') return { ...parcel1, ...data }
        if (id === 'tx-3') return { ...parcel3, ...data }
        return null
      }),
      getCategoryIds: vi.fn().mockResolvedValue(new Map([['tx-2', []]])),
    } as unknown as TransactionRepository

    const accountRepository = {
      findById: vi.fn().mockResolvedValue(checkingAccount),
    } as unknown as AccountRepository

    const service = buildService({ transactionRepository, accountRepository })

    vi.spyOn(
      service as unknown as {
        findInstallmentSiblings: () => Promise<typeof parcel1[]>
      },
      'findInstallmentSiblings'
    ).mockResolvedValue([parcel1, parcel2, parcel3])

    return { service, transactionRepository, accountRepository }
  }

  it('does not cascade when scope is current', async () => {
    const { service, transactionRepository } = setupUpdateMocks()

    await service.update('org-1', 'tx-2', {
      date: '2026-08-05T12:00:00.000Z',
      installmentDateScope: 'current',
    })

    expect(transactionRepository.update).toHaveBeenCalledTimes(1)
    expect(transactionRepository.update).toHaveBeenCalledWith(
      'tx-2',
      expect.objectContaining({ date: new Date('2026-08-05T12:00:00.000Z') })
    )
  })

  it('shifts following unpaid parcels for from_here', async () => {
    const { service, transactionRepository } = setupUpdateMocks()

    await service.update('org-1', 'tx-2', {
      date: '2026-08-05T12:00:00.000Z',
      installmentDateScope: 'from_here',
    })

    expect(transactionRepository.update).toHaveBeenCalledTimes(2)
    expect(transactionRepository.update).toHaveBeenNthCalledWith(
      2,
      'tx-3',
      expect.objectContaining({ date: new Date('2026-09-05T12:00:00.000Z') })
    )
  })

  it('shifts all unpaid parcels for all', async () => {
    const { service, transactionRepository } = setupUpdateMocks()

    await service.update('org-1', 'tx-2', {
      date: '2026-08-05T12:00:00.000Z',
      installmentDateScope: 'all',
    })

    expect(transactionRepository.update).toHaveBeenCalledTimes(3)
    expect(transactionRepository.update).toHaveBeenCalledWith(
      'tx-1',
      expect.objectContaining({ date: new Date('2026-07-06T12:00:00.000Z') })
    )
    expect(transactionRepository.update).toHaveBeenCalledWith(
      'tx-3',
      expect.objectContaining({ date: new Date('2026-09-05T12:00:00.000Z') })
    )
  })

  it('skips cascade on credit_card accounts', async () => {
    const { service, transactionRepository, accountRepository } = setupUpdateMocks()
    ;(accountRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...checkingAccount,
      type: 'credit_card',
    })

    await service.update('org-1', 'tx-2', {
      date: '2026-08-05T12:00:00.000Z',
      installmentDateScope: 'all',
    })

    expect(transactionRepository.update).toHaveBeenCalledTimes(1)
  })

  it('skips paid siblings when cascading', async () => {
    const { service, transactionRepository } = setupUpdateMocks()
    vi.spyOn(
      service as unknown as {
        findInstallmentSiblings: () => Promise<typeof parcel1[]>
      },
      'findInstallmentSiblings'
    ).mockResolvedValue([{ ...parcel1, status: 'paid' }, parcel2, parcel3])

    await service.update('org-1', 'tx-2', {
      date: '2026-08-05T12:00:00.000Z',
      installmentDateScope: 'all',
    })

    expect(transactionRepository.update).toHaveBeenCalledTimes(2)
    expect(transactionRepository.update).toHaveBeenCalledWith(
      'tx-3',
      expect.objectContaining({ date: new Date('2026-09-05T12:00:00.000Z') })
    )
    expect(transactionRepository.update).not.toHaveBeenCalledWith(
      'tx-1',
      expect.anything()
    )
  })
})
