import { describe, expect, it } from 'vitest'

import { resolveTransactionUpdateScope } from './update-transaction-scope'

describe('resolveTransactionUpdateScope', () => {
  it('applies only current pending occurrence when updateSeries is false', () => {
    expect(resolveTransactionUpdateScope(false)).toEqual({
      series: { title: false, type: false, amount: false, payToEmail: false },
      currentOccurrence: { amount: true, description: true, dueDate: true },
      pendingOccurrences: { amount: false, description: false, dueDate: false },
      tags: false,
    })
  })

  it('treats undefined updateSeries as single-occurrence update', () => {
    expect(resolveTransactionUpdateScope(undefined)).toEqual(
      resolveTransactionUpdateScope(false)
    )
  })

  it('propagates series fields and pending occurrences when updateSeries is true', () => {
    expect(resolveTransactionUpdateScope(true)).toEqual({
      series: { title: true, type: true, amount: true, payToEmail: true },
      currentOccurrence: { amount: true, description: true, dueDate: true },
      pendingOccurrences: { amount: true, description: true, dueDate: false },
      tags: true,
    })
  })
})
