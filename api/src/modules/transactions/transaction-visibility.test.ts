import { describe, expect, it } from 'vitest'

import {
  canMutateTransaction,
  isOrgOwner,
  memberVisibleTransactionCondition,
  toTransactionViewer,
  transactionVisibilityCondition,
} from './transaction-visibility'

describe('transaction visibility', () => {
  it('identifies org owner', () => {
    expect(isOrgOwner('user-1', 'user-1')).toBe(true)
    expect(isOrgOwner('user-1', 'user-2')).toBe(false)
    expect(isOrgOwner('user-1', null)).toBe(false)
  })

  it('builds viewer with isOwner flag', () => {
    expect(toTransactionViewer('owner', 'owner')).toEqual({
      userId: 'owner',
      ownerId: 'owner',
      isOwner: true,
    })
    expect(toTransactionViewer('member', 'owner')).toEqual({
      userId: 'member',
      ownerId: 'owner',
      isOwner: false,
    })
  })

  it('allows anyone to mutate only own created transactions', () => {
    const owner = toTransactionViewer('owner', 'owner')
    expect(canMutateTransaction(owner, 'owner')).toBe(true)
    expect(canMutateTransaction(owner, null)).toBe(false)
    expect(canMutateTransaction(owner, 'someone-else')).toBe(false)

    const member = toTransactionViewer('member', 'owner')
    expect(canMutateTransaction(member, 'member')).toBe(true)
    expect(canMutateTransaction(member, 'owner')).toBe(false)
    expect(canMutateTransaction(member, null)).toBe(false)
  })

  it('skips SQL visibility filter only for missing viewer', () => {
    expect(transactionVisibilityCondition(undefined)).toBeUndefined()
  })

  it('returns SQL condition for any present viewer including org owner', () => {
    expect(
      transactionVisibilityCondition({
        userId: 'owner',
        ownerId: 'owner',
        isOwner: true,
      })
    ).toBeDefined()
    expect(
      transactionVisibilityCondition({
        userId: 'member',
        ownerId: 'owner',
        isOwner: false,
      })
    ).toBeDefined()
  })

  it('includes account ownership path for imported / unattributed txs', () => {
    expect(memberVisibleTransactionCondition('member')).toBeDefined()
    expect(transactionVisibilityCondition(toTransactionViewer('member', 'owner'))).toBeDefined()
  })
})
