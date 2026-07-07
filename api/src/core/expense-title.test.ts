import { describe, expect, it } from 'vitest'

import { normalizeExpenseTitle, stripInstallmentBaseTitle } from './expense-title'

describe('stripInstallmentBaseTitle', () => {
  it('removes dash parcela suffix', () => {
    expect(stripInstallmentBaseTitle('NETFLIX - Parcela 2/12')).toBe('NETFLIX')
  })

  it('removes space parcela suffix', () => {
    expect(stripInstallmentBaseTitle('SPOTIFY Parcela 1/3')).toBe('SPOTIFY')
  })

  it('keeps title without parcela', () => {
    expect(stripInstallmentBaseTitle('UBER *TRIP')).toBe('UBER *TRIP')
  })
})

describe('normalizeExpenseTitle', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeExpenseTitle('Farmácia São João')).toBe('farmacia sao joao')
  })

  it('normalizes installment titles consistently', () => {
    expect(normalizeExpenseTitle('NETFLIX - Parcela 1/12')).toBe('netflix')
    expect(normalizeExpenseTitle('NETFLIX - Parcela 3/12')).toBe('netflix')
  })

  it('collapses extra whitespace', () => {
    expect(normalizeExpenseTitle('  IFOOD   RESTAURANTE  ')).toBe('ifood restaurante')
  })
})
