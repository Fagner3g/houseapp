import { describe, expect, it } from 'vitest'

import { accountBalanceBridge, formatSignedCurrency } from './account-balance-bridge'

describe('accountBalanceBridge', () => {
  it('backs out start-of-period from balance and period net', () => {
    expect(
      accountBalanceBridge({
        balance: '130.00',
        income: '100.00',
        expense: '70.00',
      })
    ).toEqual({
      beforePeriod: 100,
      periodNet: 30,
      balance: 130,
      income: 100,
      expense: 70,
    })
  })

  it('handles negative period net', () => {
    expect(
      accountBalanceBridge({
        balance: '50.00',
        income: '10.00',
        expense: '40.00',
      })
    ).toMatchObject({
      beforePeriod: 80,
      periodNet: -30,
      balance: 50,
    })
  })
})

describe('formatSignedCurrency', () => {
  const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

  it('adds + for positive and − for negative', () => {
    expect(formatSignedCurrency(30, fmt)).toBe('+R$ 30,00')
    expect(formatSignedCurrency(-30, fmt)).toBe('−R$ 30,00')
    expect(formatSignedCurrency(0, fmt)).toBe('R$ 0,00')
  })
})
