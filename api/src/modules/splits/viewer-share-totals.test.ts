import { describe, expect, it } from 'vitest'

import { centavosToString } from '@/core/money'

import { sumViewerShareAmounts, toViewerShareTotalDtos } from './viewer-share-totals'

describe('viewer-share-totals', () => {
  it('sums debtor share amounts in centavos', () => {
    const total = sumViewerShareAmounts([
      { amount: 8375n },
      { amount: 1950n },
      { amount: 1750n },
      { amount: 1725n },
      { amount: 11560n },
      { amount: 2565n },
      { amount: 3420n },
      { amount: 395n },
      { amount: 325n },
      { amount: 1300n },
      { amount: 990n },
    ])
    expect(total).toBe(34355n)
  })

  it('maps rows to money-string DTOs', () => {
    const dtos = toViewerShareTotalDtos(
      [
        { transactionId: 'tx-1', amount: 8375n, remainingTotal: 8375n },
        { transactionId: 'tx-2', amount: 1950n, remainingTotal: 0n },
      ],
      centavosToString
    )
    expect(dtos).toEqual([
      { transactionId: 'tx-1', amount: '83.75', remainingAmount: '83.75' },
      { transactionId: 'tx-2', amount: '19.50', remainingAmount: '0.00' },
    ])
  })
})
