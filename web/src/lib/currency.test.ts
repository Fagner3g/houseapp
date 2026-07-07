import { describe, expect, it } from 'vitest'

import {
  centsStringToNumber,
  formatCentsString,
  moneyStringToReais,
  reaisToCentsString,
  reaisToMoneyString,
} from './currency'

describe('moneyStringToReais', () => {
  it('parses API decimal reais strings without dividing again', () => {
    expect(moneyStringToReais('6983.61')).toBe(6983.61)
    expect(moneyStringToReais('17.00')).toBe(17)
    expect(moneyStringToReais('0.13')).toBe(0.13)
  })

  it('parses internal integer centavos strings', () => {
    expect(moneyStringToReais('1700')).toBe(17)
    expect(moneyStringToReais('698361')).toBe(6983.61)
    expect(moneyStringToReais('90000')).toBe(900)
  })

  it('parses 3-digit whole numbers as reais without decimal', () => {
    expect(moneyStringToReais('900')).toBe(900)
    expect(moneyStringToReais('450')).toBe(450)
  })
})

describe('formatCentsString', () => {
  it('formats API and internal money strings correctly', () => {
    expect(formatCentsString('6983.61')).toContain('6.983,61')
    expect(formatCentsString(reaisToCentsString(17))).toContain('17,00')
  })

  it('keeps centsStringToNumber aligned with formatting', () => {
    expect(centsStringToNumber('538.07')).toBe(538.07)
    expect(centsStringToNumber('53807')).toBe(538.07)
  })
})

describe('reaisToMoneyString', () => {
  it('formats API request amounts with two decimals', () => {
    expect(reaisToMoneyString(6983.61)).toBe('6983.61')
  })
})
