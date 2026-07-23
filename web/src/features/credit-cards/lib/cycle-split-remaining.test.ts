import { describe, expect, it } from 'vitest'

import {
  cyclePendingSplitTransactionIds,
  sumCycleSplitRemaining,
  sumCycleViewerShareAmount,
  sumCycleViewerShareRemaining,
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

describe('sumCycleViewerShareRemaining', () => {
  it('sums positive remainingAmount for cycle txs', () => {
    const shares = new Map([
      ['a', { amount: 100, remainingAmount: 40 }],
      ['b', { amount: 50, remainingAmount: 50 }],
      ['c', { amount: 10, remainingAmount: 0 }],
    ])
    expect(sumCycleViewerShareRemaining(['a', 'b', 'c'], shares)).toBe(90)
  })
})

describe('sumCycleViewerShareAmount', () => {
  it('sums share amounts for cycle txs', () => {
    const shares = new Map([
      ['a', { amount: 100 }],
      ['b', { amount: 50 }],
    ])
    expect(sumCycleViewerShareAmount(['a', 'b', 'missing'], shares)).toBe(150)
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
