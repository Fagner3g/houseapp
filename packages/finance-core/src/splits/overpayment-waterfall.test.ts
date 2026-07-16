import { describe, expect, it } from 'vitest'

import { allocateOverpaymentWaterfall } from './overpayment-waterfall'

describe('allocateOverpaymentWaterfall', () => {
  it('pays current fully and leaves partial on next (500 on 3x 283.80)', () => {
    expect(
      allocateOverpaymentWaterfall({
        payment: 50000n,
        parcels: [
          { id: '1', remaining: 28380n },
          { id: '2', remaining: 28380n },
          { id: '3', remaining: 28380n },
        ],
      })
    ).toEqual([
      { id: '1', apply: 28380n, status: 'paid' },
      { id: '2', apply: 21620n, status: 'partial' },
    ])
  })

  it('returns null when payment fits the first parcel', () => {
    expect(
      allocateOverpaymentWaterfall({
        payment: 28380n,
        parcels: [
          { id: '1', remaining: 28380n },
          { id: '2', remaining: 28380n },
        ],
      })
    ).toBeNull()
  })

  it('returns null when payment exceeds all remainings', () => {
    expect(
      allocateOverpaymentWaterfall({
        payment: 90000n,
        parcels: [
          { id: '1', remaining: 28380n },
          { id: '2', remaining: 28380n },
        ],
      })
    ).toBeNull()
  })

  it('quits multiple full parcels when amount matches', () => {
    expect(
      allocateOverpaymentWaterfall({
        payment: 56760n,
        parcels: [
          { id: '1', remaining: 28380n },
          { id: '2', remaining: 28380n },
          { id: '3', remaining: 28380n },
        ],
      })
    ).toEqual([
      { id: '1', apply: 28380n, status: 'paid' },
      { id: '2', apply: 28380n, status: 'paid' },
    ])
  })

  it('returns null for zero payment', () => {
    expect(
      allocateOverpaymentWaterfall({
        payment: 0n,
        parcels: [{ id: '1', remaining: 100n }],
      })
    ).toBeNull()
  })
})
