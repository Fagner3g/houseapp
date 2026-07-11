import { describe, expect, it } from 'vitest'

import {
  cyclePendingSplitTransactionIds,
  sumCycleSplitRemaining,
} from './cycle-split-remaining'

describe('sumCycleSplitRemaining', () => {
  it('sums only positive remaining for cycle txs', () => {
    const remaining = new Map([
      ['a', 100],
      ['b', 50.5],
      ['c', 0],
      ['outside', 999],
    ])
    expect(sumCycleSplitRemaining(['a', 'b', 'c'], remaining)).toBe(150.5)
  })
})

describe('cyclePendingSplitTransactionIds', () => {
  it('returns ids with remaining > 0', () => {
    const remaining = new Map([
      ['a', 10],
      ['b', 0],
      ['c', 5],
    ])
    expect(cyclePendingSplitTransactionIds(['a', 'b', 'c'], remaining)).toEqual(
      new Set(['a', 'c'])
    )
  })
})
