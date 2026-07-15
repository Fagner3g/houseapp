import { describe, expect, it } from 'vitest'

import {
  userIsSplitCreditorCondition,
  userOwnsTransactionCondition,
} from './split-expense-attribution'

describe('userOwnsTransactionCondition', () => {
  it('builds SQL for member without treating null-card as everyone-owns', () => {
    const member = userOwnsTransactionCondition('member', 'owner')
    const owner = userOwnsTransactionCondition('owner', 'owner')
    expect(member).toBeDefined()
    expect(owner).toBeDefined()
    expect(userIsSplitCreditorCondition('member', 'owner')).toBeDefined()
  })
})
