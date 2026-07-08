import { describe, expect, it } from 'vitest'

import { buildItauSuggestedAccount, suggestItauAccountName } from './suggested-account'

describe('suggestItauAccountName', () => {
  it('strips the final four suffix from the card label', () => {
    expect(suggestItauAccountName('Itau Personnalitte MC final 7735', '7735')).toBe(
      'Itau Personnalitte MC'
    )
  })

  it('falls back to Itaú when the label is empty', () => {
    expect(suggestItauAccountName('', '7735')).toBe('Itaú')
  })
})

describe('buildItauSuggestedAccount', () => {
  it('builds an Itaú suggestion from statement dates', () => {
    const result = buildItauSuggestedAccount({
      cardName: 'Itau Personnalitte MC final 7735',
      cardLastFour: '7735',
      closingDate: '2026-05-01T12:00:00.000Z',
      dueDate: '2026-05-18T12:00:00.000Z',
    })

    expect(result).toEqual({
      name: 'Itau Personnalitte MC',
      institution: 'itau',
      currency: 'BRL',
      closingDay: 1,
      dueDay: 18,
      creditLimit: null,
    })
  })
})
