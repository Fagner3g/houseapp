import { describe, expect, it } from 'vitest'

import { normalizeMerchantTitle } from './normalize-merchant-title'

describe('normalizeMerchantTitle', () => {
  it('normalizes casing and installment suffixes', () => {
    expect(normalizeMerchantTitle('App Premmia - NuPay')).toBe('app premmia - nupay')
    expect(normalizeMerchantTitle('Loja XYZ - Parcela 2/6')).toBe('loja xyz')
    expect(normalizeMerchantTitle('Loja XYZ Parcela 2/6')).toBe('loja xyz')
  })
})
