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
  it('skips filter only when viewer is missing', () => {
    expect(accountVisibilityCondition(undefined)).toBeUndefined()
    expect(cardVisibilityCondition(undefined)).toBeUndefined()
  })

  it('applies personal filter for org owners', () => {
    expect(accountVisibilityCondition(toTransactionViewer('owner', 'owner'))).toBeDefined()
    expect(cardVisibilityCondition(toTransactionViewer('owner', 'owner'))).toBeDefined()
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
    expect(
      accountVisibilityCondition(toTransactionViewer('owner', 'owner'), {
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
  })
})
