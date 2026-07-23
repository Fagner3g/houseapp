import { describe, expect, it } from 'vitest'

import { resolveTargetedMemberUserId } from './resolve-targeted-member'

describe('resolveTargetedMemberUserId', () => {
  it('uses notifyUserId on cron (no limit)', () => {
    expect(resolveTargetedMemberUserId('aline')).toBe('aline')
  })

  it('prefers manual limitToUserId', () => {
    expect(resolveTargetedMemberUserId('aline', 'fagner')).toBe('fagner')
  })

  it('returns null when neither is set', () => {
    expect(resolveTargetedMemberUserId(null)).toBeNull()
    expect(resolveTargetedMemberUserId(undefined)).toBeNull()
  })
})
