import { describe, expect, it } from 'vitest'

import {
  extrapolateInstallmentSeriesTotalCentavos,
  resolvePersonShareInstallmentAmountCentavos,
  shouldExtrapolateInstallmentSplitTotals,
} from './installments'

describe('extrapolateInstallmentSeriesTotalCentavos', () => {
  it('scales a single parcel share across the series', () => {
    expect(extrapolateInstallmentSeriesTotalCentavos(8375n, 1, 10)).toBe(83750n)
  })

  it('returns the materialized total when all parcels exist', () => {
    expect(extrapolateInstallmentSeriesTotalCentavos(83750n, 10, 10)).toBe(83750n)
  })
})

describe('shouldExtrapolateInstallmentSplitTotals', () => {
  it('extrapolates imported partial installment series', () => {
    expect(
      shouldExtrapolateInstallmentSplitTotals({
        isImportedStatement: true,
        siblingCount: 1,
        materializedInstallmentSplitCount: 1,
        installmentsTotal: 10,
      })
    ).toBe(true)
  })

  it('does not extrapolate when collectLumpSum is set', () => {
    expect(
      shouldExtrapolateInstallmentSplitTotals({
        isImportedStatement: true,
        siblingCount: 1,
        materializedInstallmentSplitCount: 1,
        installmentsTotal: 10,
        collectLumpSum: true,
      })
    ).toBe(false)
  })

  it('does not extrapolate manual purchases', () => {
    expect(
      shouldExtrapolateInstallmentSplitTotals({
        isImportedStatement: false,
        siblingCount: 1,
        materializedInstallmentSplitCount: 1,
        installmentsTotal: 10,
      })
    ).toBe(false)
  })
})

describe('resolvePersonShareInstallmentAmountCentavos', () => {
  it('divides extrapolated total share for a single split row', () => {
    expect(
      resolvePersonShareInstallmentAmountCentavos({
        totalOwedCentavos: 83750n,
        installmentsTotal: 10,
        installmentNumber: 1,
        currentSplitAmountCentavos: 8375n,
        materializedInstallmentSplits: 1,
      })
    ).toBe(8375n)
  })

  it('divides a full manual share stored on parcel 1', () => {
    expect(
      resolvePersonShareInstallmentAmountCentavos({
        totalOwedCentavos: 45000n,
        installmentsTotal: 3,
        installmentNumber: 1,
        currentSplitAmountCentavos: 45000n,
        materializedInstallmentSplits: 1,
      })
    ).toBe(15000n)
  })

  it('keeps per-installment amount when each parcel has its own split', () => {
    expect(
      resolvePersonShareInstallmentAmountCentavos({
        totalOwedCentavos: 45000n,
        installmentsTotal: 3,
        installmentNumber: 1,
        currentSplitAmountCentavos: 15000n,
        materializedInstallmentSplits: 3,
      })
    ).toBe(15000n)
  })

  it('keeps full share when collectLumpSum is set', () => {
    expect(
      resolvePersonShareInstallmentAmountCentavos({
        totalOwedCentavos: 45000n,
        installmentsTotal: 3,
        installmentNumber: 1,
        currentSplitAmountCentavos: 45000n,
        materializedInstallmentSplits: 1,
        collectLumpSum: true,
      })
    ).toBe(45000n)
  })
})
