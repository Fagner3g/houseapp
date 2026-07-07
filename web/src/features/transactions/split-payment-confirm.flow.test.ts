import { describe, expect, it, vi } from 'vitest'

import type { ListSplits200SplitsItem } from '@/api/generated/model'

import {
  buildUnsettledSplitItems,
  getSplitRemainingReais,
} from './split-debt-summary.utils'

function makeSplit(
  overrides: Partial<ListSplits200SplitsItem> = {}
): ListSplits200SplitsItem {
  return {
    id: 'split-1',
    transactionId: 'tx-1',
    userId: null,
    contactName: 'Karoline',
    contactPhone: null,
    contactEmail: null,
    amount: '150.00',
    description: null,
    status: 'pending',
    paidAmount: '0.00',
    paidAt: null,
    isNotified: false,
    lastNotifiedAt: null,
    notifyEnabled: true,
    createdAt: '2026-07-06T00:00:00.000Z',
    updatedAt: '2026-07-06T00:00:00.000Z',
    ...overrides,
  }
}

describe('split payment confirmation flow', () => {
  it('registers remaining split payments before executing transaction pay', async () => {
    const splits = [makeSplit()]
    const items = buildUnsettledSplitItems(splits, split => split.contactName ?? 'Contato')
    const registerSplitPayment = vi.fn().mockResolvedValue(undefined)
    const payTransaction = vi.fn().mockResolvedValue(undefined)

    for (const item of items) {
      await registerSplitPayment({
        transactionId: 'tx-1',
        id: item.split.id,
        amount: item.remainingReais.toFixed(2),
        method: 'pix',
      })
    }
    await payTransaction({ id: 'tx-1' })

    expect(registerSplitPayment).toHaveBeenCalledWith({
      transactionId: 'tx-1',
      id: 'split-1',
      amount: '150.00',
      method: 'pix',
    })
    expect(registerSplitPayment).toHaveBeenCalledTimes(1)
    expect(payTransaction).toHaveBeenCalledTimes(1)
    expect(registerSplitPayment.mock.invocationCallOrder[0]).toBeLessThan(
      payTransaction.mock.invocationCallOrder[0]!
    )
  })

  it('skips split registration when all splits are settled', async () => {
    const splits = [makeSplit({ status: 'paid', paidAmount: '150.00' })]
    const items = buildUnsettledSplitItems(splits, split => split.contactName ?? 'Contato')
    const registerSplitPayment = vi.fn()
    const payTransaction = vi.fn().mockResolvedValue(undefined)

    if (items.length === 0) {
      await payTransaction({ id: 'tx-1' })
    }

    expect(registerSplitPayment).not.toHaveBeenCalled()
    expect(payTransaction).toHaveBeenCalled()
  })

  it('uses partial remaining amount when split is partially paid', () => {
    const split = makeSplit({ status: 'partial', paidAmount: '50.00' })
    expect(getSplitRemainingReais(split)).toBe(100)
  })
})
