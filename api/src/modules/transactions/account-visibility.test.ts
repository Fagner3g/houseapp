import { describe, expect, it } from 'vitest'

import {
  accountVisibilityCondition,
  cardVisibilityCondition,
  memberAccessibleAccountCondition,
  memberOwnedAccountCondition,
  memberOwnedCardCondition,
} from './account-visibility'
import { toTransactionViewer } from './transaction-visibility'

describe('account / card visibility', () => {
  it('skips account filter for owners', () => {
    expect(accountVisibilityCondition(toTransactionViewer('owner', 'owner'))).toBeUndefined()
  })

  it('applies accessible condition for members by default', () => {
    expect(
      accountVisibilityCondition(toTransactionViewer('member', 'owner'))
    ).toBeDefined()
    expect(memberAccessibleAccountCondition('member')).toBeDefined()
  })

  it('applies owned-only condition when requested', () => {
    expect(
      accountVisibilityCondition(toTransactionViewer('member', 'owner'), {
        ownedOnly: true,
      })
    ).toBeDefined()
    expect(memberOwnedAccountCondition('member')).toBeDefined()
  })

  it('builds card visibility for owned and accessible modes', () => {
    expect(memberOwnedCardCondition('member')).toBeDefined()
    expect(
      cardVisibilityCondition(toTransactionViewer('member', 'owner'))
    ).toBeDefined()
    expect(
      cardVisibilityCondition(toTransactionViewer('member', 'owner'), {
        ownedOnly: true,
      })
    ).toBeDefined()
    expect(cardVisibilityCondition(toTransactionViewer('owner', 'owner'))).toBeUndefined()
  })
})
