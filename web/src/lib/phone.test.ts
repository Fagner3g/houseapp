import { describe, expect, it } from 'vitest'

import { formatPhoneInput, isValidPhoneDigits, normalizePhoneDigits } from './phone'

describe('phone', () => {
  it('formats mobile numbers', () => {
    expect(formatPhoneInput('31988887777')).toBe('(31) 98888-7777')
  })

  it('formats landline numbers', () => {
    expect(formatPhoneInput('1133334444')).toBe('(11) 3333-4444')
  })

  it('strips non-digits on normalize', () => {
    expect(normalizePhoneDigits('(31) 98888-7777')).toBe('31988887777')
  })

  it('validates digit length', () => {
    expect(isValidPhoneDigits('31988887777')).toBe(true)
    expect(isValidPhoneDigits('1133334444')).toBe(true)
    expect(isValidPhoneDigits('31971')).toBe(false)
  })
})
