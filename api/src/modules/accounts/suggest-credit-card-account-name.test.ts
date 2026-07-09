import { describe, expect, it } from 'vitest'

import { suggestCreditCardAccountName } from './suggest-credit-card-account-name'

describe('suggestCreditCardAccountName', () => {
  it('keeps base name when available', () => {
    expect(suggestCreditCardAccountName('Nubank', 'nubank', [])).toBe('Nubank')
  })

  it('suggests a distinct name when base name is taken', () => {
    expect(
      suggestCreditCardAccountName('Nubank', 'nubank', [{ name: 'Nubank', isActive: true }])
    ).toBe('Nubank Cartão')
  })

  it('avoids names taken by inactive accounts', () => {
    expect(
      suggestCreditCardAccountName('Nubank', 'nubank', [
        { name: 'Nubank', isActive: true },
        { name: 'Nubank Cartão', isActive: false },
      ])
    ).toBe('Nubank Fatura')
  })

  it('avoids names already used by inactive accounts', () => {
    expect(
      suggestCreditCardAccountName('Nubank', 'nubank', [{ name: 'Nubank', isActive: false }])
    ).toBe('Nubank Cartão')
  })
})
