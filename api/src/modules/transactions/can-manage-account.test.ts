import { describe, expect, it } from 'vitest'

import { canManageAccount } from './can-manage-account'
import { toTransactionViewer } from './transaction-visibility'

describe('canManageAccount', () => {
  it('allows missing viewer (system callers)', () => {
    expect(canManageAccount(undefined, { createdBy: 'other' })).toBe(true)
  })

  it('denies org owner without personal ownership', () => {
    expect(
      canManageAccount(toTransactionViewer('owner', 'owner'), { createdBy: 'other' })
    ).toBe(false)
  })

  it('allows the account creator including org owner', () => {
    expect(
      canManageAccount(toTransactionViewer('member', 'owner'), { createdBy: 'member' })
    ).toBe(true)
    expect(
      canManageAccount(toTransactionViewer('owner', 'owner'), { createdBy: 'owner' })
    ).toBe(true)
  })

  it('allows assigned card holders', () => {
    expect(
      canManageAccount(toTransactionViewer('member', 'owner'), { createdBy: 'owner' }, [
        'member',
      ])
    ).toBe(true)
    expect(
      canManageAccount(toTransactionViewer('owner', 'owner'), { createdBy: 'member' }, [
        'owner',
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
