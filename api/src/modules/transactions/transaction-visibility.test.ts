import { describe, expect, it } from 'vitest'

import {
  canMutateTransaction,
  isOrgOwner,
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

  it('allows owner to mutate any transaction', () => {
    const owner = toTransactionViewer('owner', 'owner')
    expect(canMutateTransaction(owner, null)).toBe(true)
    expect(canMutateTransaction(owner, 'someone-else')).toBe(true)
  })

  it('allows member to mutate only own created transactions', () => {
    const member = toTransactionViewer('member', 'owner')
    expect(canMutateTransaction(member, 'member')).toBe(true)
    expect(canMutateTransaction(member, 'owner')).toBe(false)
    expect(canMutateTransaction(member, null)).toBe(false)
  })

  it('skips SQL visibility filter for owners and missing viewer', () => {
    expect(transactionVisibilityCondition(undefined)).toBeUndefined()
    expect(
      transactionVisibilityCondition({
        userId: 'owner',
        ownerId: 'owner',
        isOwner: true,
      })
    ).toBeUndefined()
  })

  it('returns SQL condition for non-owner members', () => {
    const condition = transactionVisibilityCondition({
      userId: 'member',
      ownerId: 'owner',
      isOwner: false,
    })
    expect(condition).toBeDefined()
  })
})
