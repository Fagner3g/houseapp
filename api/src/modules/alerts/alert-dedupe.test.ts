import { describe, expect, it } from 'vitest'

import { resolveAlertDedupeKey, shouldSkipAlertDedupe } from './alert-dedupe'

describe('alert-dedupe', () => {
  it('skips when explicitly requested', () => {
    expect(shouldSkipAlertDedupe(true)).toBe(true)
    expect(resolveAlertDedupeKey('owner-tx:1:whatsapp', true)).toMatch(
      /^owner-tx:1:whatsapp:run-\d+$/
    )
  })

  it('keeps dedupe by default in any environment', () => {
    const previous = process.env.NODE_ENV
    try {
      process.env.NODE_ENV = 'development'
      expect(shouldSkipAlertDedupe()).toBe(false)
      expect(resolveAlertDedupeKey('owner-tx:1:whatsapp')).toBe('owner-tx:1:whatsapp')

      process.env.NODE_ENV = 'production'
      expect(shouldSkipAlertDedupe()).toBe(false)
      expect(resolveAlertDedupeKey('owner-tx:1:whatsapp')).toBe('owner-tx:1:whatsapp')
      expect(shouldSkipAlertDedupe(false)).toBe(false)
    } finally {
      process.env.NODE_ENV = previous
    }
  })
})
