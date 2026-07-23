import { describe, expect, it } from 'vitest'

import {
  allocateUnderpaymentCarry,
  nextAmountAfterUnderpaymentCarry,
} from './underpayment-carry'

describe('allocateUnderpaymentCarry', () => {
  it('closes current at payment and returns shortfall for next parcel', () => {
    expect(
      allocateUnderpaymentCarry({
        currentAmount: 40000n,
        currentPaid: 0n,
        payment: 25000n,
      })
    ).toEqual({
      currentAmount: 25000n,
      currentPaidAmount: 25000n,
      shortfall: 15000n,
    })
  })

  it('accounts for prior partial paid on current', () => {
    expect(
      allocateUnderpaymentCarry({
        currentAmount: 40000n,
        currentPaid: 10000n,
        payment: 15000n,
      })
    ).toEqual({
      currentAmount: 25000n,
      currentPaidAmount: 25000n,
      shortfall: 15000n,
    })
  })

  it('returns null for full payment', () => {
    expect(
      allocateUnderpaymentCarry({
        currentAmount: 40000n,
        currentPaid: 0n,
        payment: 40000n,
      })
    ).toBeNull()
  })

  it('returns null for overpay', () => {
    expect(
      allocateUnderpaymentCarry({
        currentAmount: 40000n,
        currentPaid: 0n,
        payment: 50000n,
      })
    ).toBeNull()
  })

  it('returns null for zero payment', () => {
    expect(
      allocateUnderpaymentCarry({
        currentAmount: 40000n,
        currentPaid: 0n,
        payment: 0n,
      })
    ).toBeNull()
  })
})

describe('nextAmountAfterUnderpaymentCarry', () => {
  it('adds shortfall onto the next parcel amount', () => {
    expect(nextAmountAfterUnderpaymentCarry(20000n, 5000n)).toBe(25000n)
  })
})
