import { describe, expect, it } from 'vitest'

import { normalizePhoneDigits, phoneLookupVariants, phonesMatch } from './phone'

describe('phone helpers', () => {
  it('builds lookup variants with and without country code', () => {
    expect(phoneLookupVariants('31999999999')).toEqual(['31999999999', '5531999999999'])
    expect(phoneLookupVariants('5531999999999')).toEqual(['5531999999999', '31999999999'])
  })

  it('matches phones stored with different formatting', () => {
    expect(phonesMatch('5531999999999', '31999999999')).toBe(true)
    expect(phonesMatch('(31) 99999-9999', '31999999999')).toBe(true)
    expect(phonesMatch(null, '31999999999')).toBe(false)
    expect(phonesMatch('5531888888888', '31999999999')).toBe(false)
  })

  it('normalizes digits only', () => {
    expect(normalizePhoneDigits('(31) 99999-9999')).toBe('31999999999')
  })
})
