import { describe, expect, it } from 'vitest'

import {
  resolveResidualInvoiceRecipientUserId,
  resolveResidualTxRecipientUserId,
} from './resolve-residual-recipient'

describe('resolveResidualTxRecipientUserId', () => {
  it('uses assigned card holder', () => {
    expect(
      resolveResidualTxRecipientUserId(
        {
          cardId: 'card-1',
          cardUserId: 'aline',
          transactionCreatedBy: 'fagner',
          accountCreatedBy: 'fagner',
        },
        'fagner'
      )
    ).toBe('aline')
  })

  it('uses account creator for unassigned card', () => {
    expect(
      resolveResidualTxRecipientUserId(
        {
          cardId: 'card-1',
          cardUserId: null,
          transactionCreatedBy: 'other',
          accountCreatedBy: 'aline',
        },
        'fagner'
      )
    ).toBe('aline')
  })

  it('uses transaction creator for checking', () => {
    expect(
      resolveResidualTxRecipientUserId(
        {
          cardId: null,
          cardUserId: null,
          transactionCreatedBy: 'aline',
          accountCreatedBy: 'fagner',
        },
        'fagner'
      )
    ).toBe('aline')
  })

  it('falls back to org owner when creators are null', () => {
    expect(
      resolveResidualTxRecipientUserId(
        {
          cardId: null,
          cardUserId: null,
          transactionCreatedBy: null,
          accountCreatedBy: null,
        },
        'fagner'
      )
    ).toBe('fagner')
  })
})

describe('resolveResidualInvoiceRecipientUserId', () => {
  it('uses account creator then org owner', () => {
    expect(resolveResidualInvoiceRecipientUserId('aline', 'fagner')).toBe('aline')
    expect(resolveResidualInvoiceRecipientUserId(null, 'fagner')).toBe('fagner')
  })
})
