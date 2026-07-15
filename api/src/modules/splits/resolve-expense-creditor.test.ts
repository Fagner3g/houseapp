import { describe, expect, it } from 'vitest'

import { resolveExpenseCreditorUserId } from './resolve-expense-creditor'

describe('resolveExpenseCreditorUserId', () => {
  it('returns assigned card owner', () => {
    expect(
      resolveExpenseCreditorUserId({
        cardId: 'card-1',
        cardUserId: 'card-owner',
        transactionCreatedBy: 'creator',
        accountCreatedBy: 'account-owner',
        orgOwnerId: 'org-owner',
      })
    ).toBe('card-owner')
  })

  it('falls back to account createdBy for unassigned card', () => {
    expect(
      resolveExpenseCreditorUserId({
        cardId: 'card-1',
        cardUserId: null,
        transactionCreatedBy: 'creator',
        accountCreatedBy: 'account-owner',
        orgOwnerId: 'org-owner',
      })
    ).toBe('account-owner')
  })

  it('falls back to org owner for unassigned card with null account createdBy', () => {
    expect(
      resolveExpenseCreditorUserId({
        cardId: 'card-1',
        cardUserId: null,
        transactionCreatedBy: 'creator',
        accountCreatedBy: null,
        orgOwnerId: 'org-owner',
      })
    ).toBe('org-owner')
  })

  it('returns transaction createdBy for checking account', () => {
    expect(
      resolveExpenseCreditorUserId({
        cardId: null,
        cardUserId: null,
        transactionCreatedBy: 'creator',
        accountCreatedBy: 'account-owner',
        orgOwnerId: 'org-owner',
      })
    ).toBe('creator')
  })

  it('falls back to org owner for checking with null createdBy', () => {
    expect(
      resolveExpenseCreditorUserId({
        cardId: null,
        cardUserId: null,
        transactionCreatedBy: null,
        accountCreatedBy: 'account-owner',
        orgOwnerId: 'org-owner',
      })
    ).toBe('org-owner')
  })
})
