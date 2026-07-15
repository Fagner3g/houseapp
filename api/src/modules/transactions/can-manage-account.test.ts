import { describe, expect, it } from 'vitest'

import { canManageAccount } from './can-manage-account'
import { toTransactionViewer } from './transaction-visibility'

describe('canManageAccount', () => {
  it('allows org owners and missing viewer', () => {
    expect(canManageAccount(undefined, { createdBy: 'other' })).toBe(true)
    expect(
      canManageAccount(toTransactionViewer('owner', 'owner'), { createdBy: 'other' })
    ).toBe(true)
  })

  it('allows the account creator', () => {
    expect(
      canManageAccount(toTransactionViewer('member', 'owner'), { createdBy: 'member' })
    ).toBe(true)
  })

  it('allows assigned card holders', () => {
    expect(
      canManageAccount(toTransactionViewer('member', 'owner'), { createdBy: 'owner' }, [
        'member',
      ])
    ).toBe(true)
  })

  it('denies temporary split-only access', () => {
    expect(
      canManageAccount(toTransactionViewer('member', 'owner'), { createdBy: 'owner' }, [
        null,
        'someone-else',
      ])
    ).toBe(false)
  })
})
