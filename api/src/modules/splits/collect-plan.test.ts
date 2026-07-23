import { describe, expect, it } from 'vitest'

import { buildCollectPlanCreateRows } from './collect-plan'

describe('buildCollectPlanCreateRows', () => {
  it('creates N rows with shared collectPlanId and monthly dueAt', () => {
    const rows = buildCollectPlanCreateRows('tx-1', {
      userId: 'user-1',
      amount: '100.00',
      installmentsTotal: 3,
      startDate: '2026-01-15',
      notifyEnabled: true,
    })

    expect(rows).toHaveLength(3)
    expect(new Set(rows.map(row => row.collectPlanId)).size).toBe(1)
    expect(rows.map(row => row.collectInstallmentNumber)).toEqual([1, 2, 3])
    expect(rows.every(row => row.collectInstallmentsTotal === 3)).toBe(true)
    expect(rows.every(row => row.collectLumpSum === false)).toBe(true)
    expect(rows.reduce((sum, row) => sum + row.amount, 0n)).toBe(10000n)
    expect(rows[0]?.dueAt?.toISOString().slice(0, 10)).toBe('2026-01-15')
    expect(rows[1]?.dueAt?.toISOString().slice(0, 10)).toBe('2026-02-15')
  })
})
