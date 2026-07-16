import { describe, expect, it, vi } from 'vitest'

import {
  allReimbursementChoicesAnswered,
  defaultReimbursementChoices,
  runUnifiedSettlement,
  type SplitReimbursementChoice,
} from './unified-settlement'

describe('runUnifiedSettlement', () => {
  it('registers reimbursed splits before bank pay', async () => {
    const registerSplitPayment = vi.fn().mockResolvedValue(undefined)
    const payTransaction = vi.fn().mockResolvedValue(undefined)

    const reimbursements: SplitReimbursementChoice[] = [
      {
        splitId: 'split-1',
        reimbursed: true,
        amountReais: 141.67,
        method: 'pix',
      },
      {
        splitId: 'split-2',
        reimbursed: false,
        amountReais: 50,
        method: 'cash',
      },
    ]

    await runUnifiedSettlement({
      reimbursements,
      registerSplitPayment,
      payTransaction,
    })

    expect(registerSplitPayment).toHaveBeenCalledTimes(1)
    expect(registerSplitPayment).toHaveBeenCalledWith({
      splitId: 'split-1',
      amountReais: 141.67,
      method: 'pix',
    })
    expect(payTransaction).toHaveBeenCalledTimes(1)
    expect(registerSplitPayment.mock.invocationCallOrder[0]).toBeLessThan(
      payTransaction.mock.invocationCallOrder[0] as number
    )
  })

  it('pays the bank transaction when nobody reimbursed yet', async () => {
    const registerSplitPayment = vi.fn()
    const payTransaction = vi.fn().mockResolvedValue(undefined)

    await runUnifiedSettlement({
      reimbursements: defaultReimbursementChoices([
        { splitId: 'split-1', remainingReais: 100 },
      ]).map(choice => ({ ...choice, reimbursed: false })),
      registerSplitPayment,
      payTransaction,
    })

    expect(registerSplitPayment).not.toHaveBeenCalled()
    expect(payTransaction).toHaveBeenCalledTimes(1)
  })

  it('skips zero-amount reimbursements but still pays', async () => {
    const registerSplitPayment = vi.fn()
    const payTransaction = vi.fn().mockResolvedValue(undefined)

    await runUnifiedSettlement({
      reimbursements: [
        {
          splitId: 'split-1',
          reimbursed: true,
          amountReais: 0,
          method: 'pix',
        },
      ],
      registerSplitPayment,
      payTransaction,
    })

    expect(registerSplitPayment).not.toHaveBeenCalled()
    expect(payTransaction).toHaveBeenCalledTimes(1)
  })

  it('runs bank pay only when there are no reimbursement choices', async () => {
    const registerSplitPayment = vi.fn()
    const payTransaction = vi.fn().mockResolvedValue(undefined)

    await runUnifiedSettlement({
      reimbursements: [],
      registerSplitPayment,
      payTransaction,
    })

    expect(registerSplitPayment).not.toHaveBeenCalled()
    expect(payTransaction).toHaveBeenCalledTimes(1)
  })
})

describe('defaultReimbursementChoices', () => {
  it('defaults to unanswered with remaining amount and pix', () => {
    expect(
      defaultReimbursementChoices([{ splitId: 'a', remainingReais: 10 }])
    ).toEqual([
      {
        splitId: 'a',
        reimbursed: null,
        amountReais: 10,
        method: 'pix',
      },
    ])
  })
})

describe('allReimbursementChoicesAnswered', () => {
  it('requires every choice to be true or false', () => {
    expect(allReimbursementChoicesAnswered([])).toBe(true)
    expect(
      allReimbursementChoicesAnswered(
        defaultReimbursementChoices([{ splitId: 'a', remainingReais: 10 }])
      )
    ).toBe(false)
    expect(
      allReimbursementChoicesAnswered([
        {
          splitId: 'a',
          reimbursed: false,
          amountReais: 10,
          method: 'pix',
        },
      ])
    ).toBe(true)
  })
})
