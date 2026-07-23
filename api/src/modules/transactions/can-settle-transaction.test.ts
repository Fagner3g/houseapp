import { describe, expect, it } from 'vitest'

import { canSettleTransaction } from './can-settle-transaction'
import { toTransactionViewer } from './transaction-visibility'

describe('canSettleTransaction', () => {
  const owner = toTransactionViewer('owner', 'owner')
  const member = toTransactionViewer('member', 'owner')

  it('allows the transaction creator', () => {
    expect(canSettleTransaction(owner, 'owner', 'owner')).toBe(true)
    expect(canSettleTransaction(member, 'member', 'owner')).toBe(true)
  })

  it('allows the expense creditor when createdBy is null (legacy)', () => {
    expect(canSettleTransaction(owner, null, 'owner')).toBe(true)
    expect(canSettleTransaction(member, null, 'owner')).toBe(false)
  })

  it('allows the expense creditor even when not the creator', () => {
    expect(canSettleTransaction(member, 'owner', 'member')).toBe(true)
  })

  it('denies unrelated viewers', () => {
    expect(canSettleTransaction(member, 'owner', 'owner')).toBe(false)
    expect(canSettleTransaction(owner, 'member', 'member')).toBe(false)
    expect(canSettleTransaction(owner, null, null)).toBe(false)
  })
})
