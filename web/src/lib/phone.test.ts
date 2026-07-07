import { describe, expect, it } from 'vitest'

import { formatPhoneInput, isValidPhoneDigits, normalizePhoneDigits } from './phone'

describe('phone', () => {
  it('formats mobile numbers', () => {
    expect(formatPhoneInput('31971697646')).toBe('(31) 97169-7646')
  })

  it('formats landline numbers', () => {
    expect(formatPhoneInput('1133334444')).toBe('(11) 3333-4444')
  })

  it('strips non-digits on normalize', () => {
    expect(normalizePhoneDigits('(31) 97169-7646')).toBe('31971697646')
  })

  it('validates digit length', () => {
    expect(isValidPhoneDigits('31971697646')).toBe(true)
    expect(isValidPhoneDigits('1133334444')).toBe(true)
    expect(isValidPhoneDigits('31971')).toBe(false)
  })
})
