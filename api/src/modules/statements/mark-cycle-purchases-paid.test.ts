import { describe, expect, it, vi } from 'vitest'

vi.mock('@/db', () => ({ db: {} }))

import { partitionPurchasesForAutoPay } from './mark-cycle-purchases-paid'

describe('partitionPurchasesForAutoPay', () => {
  it('marks non-split purchases and skips split ones', () => {
    expect(
      partitionPurchasesForAutoPay(['a', 'b', 'c'], ['b'])
    ).toEqual({
      toMarkIds: ['a', 'c'],
      skippedSplitIds: ['b'],
    })
  })

  it('marks all when there are no splits', () => {
    expect(partitionPurchasesForAutoPay(['a', 'b'], [])).toEqual({
      toMarkIds: ['a', 'b'],
      skippedSplitIds: [],
    })
  })
})
