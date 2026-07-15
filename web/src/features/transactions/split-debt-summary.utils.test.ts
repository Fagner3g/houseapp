import { describe, expect, it } from 'vitest'

import type { ListSplits200SplitsItem } from '@/api/generated/model'

import {
  buildUnsettledSplitItems,
  getSplitRemainingReais,
  getUnsettledSplits,
  hasUnsettledSplits,
  inferPurchaseSplitPercent,
  resolvePersonShareInstallmentAmountReais,
  resolveSplitInstallmentRemainingReais,
} from './split-debt-summary.utils'

function makeSplit(
  overrides: Partial<ListSplits200SplitsItem> = {}
): ListSplits200SplitsItem {
  return {
    id: 'split-1',
    transactionId: 'tx-1',
    userId: 'user-k',
    contactName: null,
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

describe('getSplitRemainingReais', () => {
  it('returns amount minus paidAmount', () => {
    expect(
      getSplitRemainingReais({ amount: '150.00', paidAmount: '50.00' })
    ).toBe(100)
  })

  it('never returns negative values', () => {
    expect(
      getSplitRemainingReais({ amount: '150.00', paidAmount: '200.00' })
    ).toBe(0)
  })
})

describe('getUnsettledSplits', () => {
  it('includes pending and partial splits only', () => {
    const splits = [
      makeSplit({ id: '1', status: 'pending' }),
      makeSplit({ id: '2', status: 'partial' }),
      makeSplit({ id: '3', status: 'paid' }),
      makeSplit({ id: '4', status: 'forgiven' }),
    ]

    expect(getUnsettledSplits(splits).map(split => split.id)).toEqual(['1', '2'])
  })
})

describe('resolveSplitInstallmentRemainingReais', () => {
  it('returns full remaining for lump-sum splits without dividing by installments', () => {
    const split = makeSplit({
      amount: '450.00',
      paidAmount: '0.00',
      status: 'pending',
      collectLumpSum: true,
      contactName: 'Karoline',
      userId: null,
    })

    expect(
      resolveSplitInstallmentRemainingReais(split, {
        debtSummary: {
          purchaseTotal: '900.00',
          myShareTotal: '450.00',
          purchaseTotalIsEstimate: false,
          viewerIsCreditor: true,
          viewerOwedTotal: null,
          viewerRemainingTotal: null,
          installmentsTotal: 3,
          currentInstallmentNumber: 1,
          currentTransactionAmount: '300.00',
          persons: [
            {
              key: 'contact:karoline:',
              name: 'Karoline',
              userId: null,
              contactName: 'Karoline',
              contactPhone: null,
              totalOwed: '450.00',
              totalPaid: '0.00',
              totalRemaining: '450.00',
              status: 'pending',
              isViewer: false,
              installments: [
                {
                  installmentNumber: 1,
                  transactionId: 'tx-1',
                  transactionAmount: '300.00',
                  splitId: 'split-1',
                  amount: '450.00',
                  paidAmount: '0.00',
                  status: 'pending',
                },
              ],
            },
          ],
        },
        installmentNumber: 1,
        installmentsTotal: 3,
      })
    ).toBe(450)
  })

  it('returns R$ 150 for parcel 1 when total owed R$ 450 is on a single split (900 / 3x / 50-50)', () => {
    const split = makeSplit({
      amount: '450.00',
      paidAmount: '0.00',
      status: 'pending',
      contactName: 'Karoline',
      userId: null,
    })

    expect(
      resolveSplitInstallmentRemainingReais(split, {
        debtSummary: {
          purchaseTotal: '900.00',
          myShareTotal: '450.00',
          purchaseTotalIsEstimate: false,
          viewerIsCreditor: true,
          viewerOwedTotal: null,
          viewerRemainingTotal: null,
          installmentsTotal: 3,
          currentInstallmentNumber: 1,
          currentTransactionAmount: '300.00',
          persons: [
            {
              key: 'contact:karoline:',
              name: 'Karoline',
              userId: null,
              contactName: 'Karoline',
              contactPhone: null,
              totalOwed: '450.00',
              totalPaid: '0.00',
              totalRemaining: '450.00',
              status: 'pending',
              isViewer: false,
              installments: [
                {
                  installmentNumber: 1,
                  transactionId: 'tx-1',
                  transactionAmount: '300.00',
                  splitId: 'split-1',
                  amount: '450.00',
                  paidAmount: '0.00',
                  status: 'pending',
                },
              ],
            },
          ],
        },
        installmentNumber: 1,
        installmentsTotal: 3,
      })
    ).toBe(150)
  })

  it('returns 0 for parcel 1 when R$ 150 was already paid on a single split', () => {
    const split = makeSplit({
      amount: '450.00',
      paidAmount: '150.00',
      status: 'partial',
      contactName: 'Karoline',
      userId: null,
    })

    expect(
      resolveSplitInstallmentRemainingReais(split, {
        debtSummary: {
          purchaseTotal: '900.00',
          myShareTotal: '450.00',
          purchaseTotalIsEstimate: false,
          viewerIsCreditor: true,
          viewerOwedTotal: null,
          viewerRemainingTotal: null,
          installmentsTotal: 3,
          currentInstallmentNumber: 1,
          currentTransactionAmount: '300.00',
          persons: [
            {
              key: 'contact:karoline:',
              name: 'Karoline',
              userId: null,
              contactName: 'Karoline',
              contactPhone: null,
              totalOwed: '450.00',
              totalPaid: '150.00',
              totalRemaining: '300.00',
              status: 'partial',
              isViewer: false,
              installments: [
                {
                  installmentNumber: 1,
                  transactionId: 'tx-1',
                  transactionAmount: '300.00',
                  splitId: 'split-1',
                  amount: '450.00',
                  paidAmount: '150.00',
                  status: 'partial',
                },
              ],
            },
          ],
        },
        installmentNumber: 1,
        installmentsTotal: 3,
      })
    ).toBe(0)
  })

  it('uses per-split paid amount when each installment has its own split row', () => {
    const split = makeSplit({
      amount: '150.00',
      paidAmount: '50.00',
      status: 'partial',
    })

    expect(
      resolveSplitInstallmentRemainingReais(split, {
        debtSummary: {
          purchaseTotal: '900.00',
          myShareTotal: '450.00',
          purchaseTotalIsEstimate: false,
          viewerIsCreditor: true,
          viewerOwedTotal: null,
          viewerRemainingTotal: null,
          installmentsTotal: 3,
          currentInstallmentNumber: 1,
          currentTransactionAmount: '300.00',
          persons: [
            {
              key: 'user:user-k',
              name: 'Karoline',
              userId: 'user-k',
              contactName: null,
              contactPhone: null,
              totalOwed: '450.00',
              totalPaid: '50.00',
              totalRemaining: '400.00',
              status: 'partial',
              isViewer: false,
              installments: [
                {
                  installmentNumber: 1,
                  transactionId: 'tx-1',
                  transactionAmount: '300.00',
                  splitId: 'split-1',
                  amount: '150.00',
                  paidAmount: '50.00',
                  status: 'partial',
                },
                {
                  installmentNumber: 2,
                  transactionId: 'tx-2',
                  transactionAmount: '300.00',
                  splitId: 'split-2',
                  amount: '150.00',
                  paidAmount: '0.00',
                  status: 'pending',
                },
                {
                  installmentNumber: 3,
                  transactionId: 'tx-3',
                  transactionAmount: '300.00',
                  splitId: 'split-3',
                  amount: '150.00',
                  paidAmount: '0.00',
                  status: 'pending',
                },
              ],
            },
          ],
        },
        installmentNumber: 1,
        installmentsTotal: 3,
      })
    ).toBe(100)
  })
})

describe('buildUnsettledSplitItems', () => {
  it('builds labels and remaining amounts for unsettled splits', () => {
    const items = buildUnsettledSplitItems(
      [
        makeSplit({ id: '1', contactName: 'Karoline', userId: null, status: 'partial', paidAmount: '50.00' }),
        makeSplit({ id: '2', status: 'paid', paidAmount: '150.00' }),
      ],
      split => split.contactName ?? 'Contato'
    )

    expect(items).toHaveLength(1)
    expect(items[0]?.label).toBe('Karoline')
    expect(items[0]?.remainingReais).toBe(100)
  })
})

describe('hasUnsettledSplits', () => {
  it('returns true when there is remaining debt on unsettled splits', () => {
    expect(hasUnsettledSplits([makeSplit({ status: 'pending' })])).toBe(true)
    expect(hasUnsettledSplits([makeSplit({ status: 'paid', paidAmount: '150.00' })])).toBe(false)
  })
})

describe('inferPurchaseSplitPercent', () => {
  it('returns rounded purchase share percent', () => {
    expect(inferPurchaseSplitPercent(837.5, 1675.1)).toBe(50)
    expect(inferPurchaseSplitPercent(450, 900)).toBe(50)
  })

  it('returns null for invalid ratios', () => {
    expect(inferPurchaseSplitPercent(0, 900)).toBeNull()
    expect(inferPurchaseSplitPercent(950, 900)).toBeNull()
  })
})

describe('resolvePersonShareInstallmentAmountReais', () => {
  it('divides total owed when a single split covers the full share on a parceled purchase', () => {
    expect(
      resolvePersonShareInstallmentAmountReais({
        totalOwedReais: 450,
        installmentsTotal: 3,
        installmentNumber: 1,
        currentSplitAmountReais: 450,
        materializedInstallmentSplits: 1,
      })
    ).toBe(150)
  })

  it('keeps split amount when each installment already has its own split', () => {
    expect(
      resolvePersonShareInstallmentAmountReais({
        totalOwedReais: 450,
        installmentsTotal: 3,
        installmentNumber: 1,
        currentSplitAmountReais: 150,
        materializedInstallmentSplits: 3,
      })
    ).toBe(150)
  })
})
