import { describe, expect, it } from 'vitest'

import {
  advanceIdsCoveredByPreview,
  buildPaymentAllocationPreview,
  formatAllocationPreviewLine,
} from './payment-allocation-preview'

const parcels = [
  { id: '1', installmentNumber: 1, remainingReais: 283.8 },
  { id: '2', installmentNumber: 2, remainingReais: 283.8 },
  { id: '3', installmentNumber: 3, remainingReais: 283.8 },
]

describe('buildPaymentAllocationPreview', () => {
  it('cascades 500 across first two parcels', () => {
    const steps = buildPaymentAllocationPreview(500, parcels)
    expect(steps).toHaveLength(2)
    expect(steps[0]).toMatchObject({
      installmentNumber: 1,
      applyReais: 283.8,
      status: 'paid',
      remainingAfterReais: 0,
    })
    expect(steps[1]?.status).toBe('partial')
    expect(steps[1]?.applyReais).toBeCloseTo(216.2, 1)
    expect(steps[1]?.remainingAfterReais).toBeCloseTo(67.6, 1)
  })

  it('keeps single-parcel partial under remaining', () => {
    const steps = buildPaymentAllocationPreview(100, parcels)
    expect(steps).toEqual([
      {
        id: '1',
        installmentNumber: 1,
        applyReais: 100,
        status: 'partial',
        remainingAfterReais: 183.8,
      },
    ])
  })
})

describe('advanceIdsCoveredByPreview', () => {
  it('returns only future parcels touched by the payment', () => {
    const steps = buildPaymentAllocationPreview(500, parcels)
    expect(advanceIdsCoveredByPreview(steps, 1)).toEqual(['2'])
  })

  it('returns prior overdue parcels touched after the current one', () => {
    const mixed = [
      { id: '2', installmentNumber: 2, remainingReais: 100 },
      { id: '1', installmentNumber: 1, remainingReais: 100 },
      { id: '3', installmentNumber: 3, remainingReais: 100 },
    ]
    const steps = buildPaymentAllocationPreview(250, mixed)
    expect(advanceIdsCoveredByPreview(steps, 2)).toEqual(['1', '3'])
  })

  it('returns empty when payment stays on the current parcel', () => {
    const steps = buildPaymentAllocationPreview(100, parcels)
    expect(advanceIdsCoveredByPreview(steps, 1)).toEqual([])
  })
})

describe('formatAllocationPreviewLine', () => {
  it('formats paid and partial lines', () => {
    expect(
      formatAllocationPreviewLine(
        {
          id: '1',
          installmentNumber: 1,
          applyReais: 283.8,
          status: 'paid',
          remainingAfterReais: 0,
        },
        'expense'
      )
    ).toContain('quitada')
    expect(
      formatAllocationPreviewLine(
        {
          id: '2',
          installmentNumber: 2,
          applyReais: 216.2,
          status: 'partial',
          remainingAfterReais: 67.6,
        },
        'income'
      )
    ).toContain('parcial')
  })
})
