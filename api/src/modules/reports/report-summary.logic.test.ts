import { describe, expect, it } from 'vitest'

import { sumNetWorth } from './report-summary.logic'

describe('sumNetWorth', () => {
  it('sums checking, savings and cash balances', () => {
    const total = sumNetWorth([
      { type: 'checking', balance: 100000n },
      { type: 'savings', balance: 50000n },
      { type: 'cash', balance: 2000n },
    ])

    expect(total).toBe(152000n)
  })

  it('excludes credit card balances from patrimônio', () => {
    const total = sumNetWorth([
      { type: 'checking', balance: 250000n },
      { type: 'credit_card', balance: 620885n },
    ])

    expect(total).toBe(250000n)
  })

  it('returns zero when only credit cards exist', () => {
    const total = sumNetWorth([{ type: 'credit_card', balance: 582883n }])

    expect(total).toBe(0n)
  })
})
