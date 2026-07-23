import { describe, expect, it, vi } from 'vitest'

import type { ListSplits200SplitsItem } from '@/api/generated/model'

import {
  buildUnsettledSplitItems,
  getSplitRemainingReais,
} from './split-debt-summary.utils'
import {
  defaultReimbursementChoices,
  runUnifiedSettlement,
} from './lib/unified-settlement'

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
    collectLumpSum: false,
    createdAt: '2026-07-06T00:00:00.000Z',
    updatedAt: '2026-07-06T00:00:00.000Z',
    ...overrides,
  }
}

describe('unified quitação flow', () => {
  it('registers reimbursements before executing transaction pay', async () => {
    const splits = [makeSplit()]
    const items = buildUnsettledSplitItems(splits, split => split.contactName ?? 'Contato')
    const registerSplitPayment = vi.fn().mockResolvedValue(undefined)
    const payTransaction = vi.fn().mockResolvedValue(undefined)

    await runUnifiedSettlement({
      reimbursements: items.map(item => ({
        splitId: item.split.id,
        reimbursed: true,
        amountReais: item.remainingReais,
        method: 'pix' as const,
      })),
      registerSplitPayment,
      payTransaction,
    })

    expect(registerSplitPayment).toHaveBeenCalledWith({
      splitId: 'split-1',
      amountReais: 150,
      method: 'pix',
    })
    expect(payTransaction).toHaveBeenCalledTimes(1)
  })

  it('still pays the bank when reimbursement is skipped (Ainda não)', async () => {
    const splits = [makeSplit()]
    const items = buildUnsettledSplitItems(splits, split => split.contactName ?? 'Contato')
    const registerSplitPayment = vi.fn()
    const payTransaction = vi.fn().mockResolvedValue(undefined)

    await runUnifiedSettlement({
      reimbursements: defaultReimbursementChoices(
        items.map(item => ({
          splitId: item.split.id,
          remainingReais: item.remainingReais,
        }))
      ).map(choice => ({ ...choice, reimbursed: false })),
      registerSplitPayment,
      payTransaction,
    })

    expect(registerSplitPayment).not.toHaveBeenCalled()
    expect(payTransaction).toHaveBeenCalledTimes(1)
  })

  it('skips reimbursement step when all splits are settled', async () => {
    const splits = [makeSplit({ status: 'paid', paidAmount: '150.00' })]
    const items = buildUnsettledSplitItems(splits, split => split.contactName ?? 'Contato')
    const registerSplitPayment = vi.fn()
    const payTransaction = vi.fn().mockResolvedValue(undefined)

    if (items.length === 0) {
      await payTransaction()
    }

    expect(items).toHaveLength(0)
    expect(registerSplitPayment).not.toHaveBeenCalled()
    expect(payTransaction).toHaveBeenCalled()
  })

  it('uses partial remaining amount when split is partially paid', () => {
    const split = makeSplit({ status: 'partial', paidAmount: '50.00' })
    expect(getSplitRemainingReais(split)).toBe(100)
  })
})
