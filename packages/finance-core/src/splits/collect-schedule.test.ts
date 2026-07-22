import { describe, expect, it } from 'vitest'

import { FinanceValidationError } from '../errors'
import { buildCollectInstallmentSchedule } from './collect-schedule'

describe('buildCollectInstallmentSchedule', () => {
  it('divides total and steps due dates monthly', () => {
    const schedule = buildCollectInstallmentSchedule({
      totalCentavos: 10001n,
      installmentsTotal: 3,
      startDate: new Date('2026-01-15T12:00:00.000Z'),
    })

    expect(schedule).toHaveLength(3)
    expect(schedule.map(item => item.amountCentavos)).toEqual([3334n, 3334n, 3333n])
    expect(schedule.map(item => item.collectInstallmentNumber)).toEqual([1, 2, 3])
    expect(schedule[0]?.dueAt.toISOString().slice(0, 10)).toBe('2026-01-15')
    expect(schedule[1]?.dueAt.toISOString().slice(0, 10)).toBe('2026-02-15')
    expect(schedule[2]?.dueAt.toISOString().slice(0, 10)).toBe('2026-03-15')
  })

  it('rejects installmentsTotal < 2', () => {
    expect(() =>
      buildCollectInstallmentSchedule({
        totalCentavos: 100n,
        installmentsTotal: 1,
        startDate: new Date('2026-01-15T12:00:00.000Z'),
      })
    ).toThrow(FinanceValidationError)
  })
})
