import { describe, expect, it } from 'vitest'

import { buildPeriodicInstallments, parseInstallmentPeriodicity } from './periodic-installments.logic'

describe('parseInstallmentPeriodicity', () => {
  it('defaults to monthly when unknown', () => {
    expect(parseInstallmentPeriodicity(undefined)).toEqual({
      frequency: 'monthly',
      interval: 1,
    })
  })

  it('parses weekly periodicity', () => {
    expect(parseInstallmentPeriodicity('weekly-2')).toEqual({
      frequency: 'weekly',
      interval: 2,
    })
  })
})

describe('buildPeriodicInstallments', () => {
  it('divides total into per-installment amounts', () => {
    const rows = buildPeriodicInstallments({
      title: 'Pia da cozinha',
      totalCentavos: 90000n,
      startDate: new Date('2026-07-15T12:00:00.000Z'),
      installmentsTotal: 3,
      periodicity: 'monthly-1',
    })

    expect(rows).toHaveLength(3)
    expect(rows.map(row => row.amount)).toEqual([30000n, 30000n, 30000n])
    expect(rows[0]?.installmentNumber).toBe(1)
    expect(rows[0]?.title).toBe('Pia da cozinha - Parcela 1/3')
  })

  it('distributes remainder cents to first installments', () => {
    const rows = buildPeriodicInstallments({
      title: 'Compra',
      totalCentavos: 90001n,
      startDate: new Date('2026-07-15T12:00:00.000Z'),
      installmentsTotal: 3,
    })

    expect(rows.map(row => row.amount)).toEqual([30001n, 30000n, 30000n])
  })

  it('shifts dates monthly', () => {
    const rows = buildPeriodicInstallments({
      title: 'Compra',
      totalCentavos: 60000n,
      startDate: new Date('2026-01-31T12:00:00.000Z'),
      installmentsTotal: 2,
      periodicity: 'monthly-1',
    })

    expect(rows[0]?.date.toISOString().slice(0, 10)).toBe('2026-01-31')
    expect(rows[1]?.date.toISOString().slice(0, 10)).toBe('2026-02-28')
  })
})
