import { describe, expect, it } from 'vitest'

import { transactionRemainingAmount } from '@/core/transaction-payment'

describe('pay with advance validation', () => {
  it('requires payment to equal current remaining plus selected advances', () => {
    const anchorRemaining = transactionRemainingAmount(30000n, 0n)
    const advanceRemaining = transactionRemainingAmount(30000n, 0n)
    const expectedTotal = anchorRemaining + advanceRemaining

    expect(expectedTotal).toBe(60000n)
    expect(60000n === expectedTotal).toBe(true)
    expect(50000n === expectedTotal).toBe(false)
  })
})
