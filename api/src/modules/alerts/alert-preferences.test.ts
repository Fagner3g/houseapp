import { describe, expect, it } from 'vitest'

import { isAlertChannelEnabled, normalizeAlertPreferences } from './alert-preferences'

describe('normalizeAlertPreferences', () => {
  it('fills missing channel flags with defaults', () => {
    expect(normalizeAlertPreferences({ whatsapp: false })).toEqual({
      whatsapp: false,
      inApp: true,
      extension: true,
    })
  })
})

describe('isAlertChannelEnabled', () => {
  it('gates whatsapp with the master switch', () => {
    expect(
      isAlertChannelEnabled('whatsapp', false, { whatsapp: true, inApp: true, extension: true })
    ).toBe(false)
    expect(
      isAlertChannelEnabled('whatsapp', true, { whatsapp: true, inApp: true, extension: true })
    ).toBe(true)
  })

  it('does not gate in_app or extension with the master switch', () => {
    expect(
      isAlertChannelEnabled('in_app', false, { whatsapp: true, inApp: true, extension: false })
    ).toBe(true)
    expect(
      isAlertChannelEnabled('extension', false, { whatsapp: true, inApp: true, extension: true })
    ).toBe(true)
  })
})
