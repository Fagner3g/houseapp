import { describe, expect, it } from 'vitest'

import {
  invoicePaymentViewTarget,
  isCheckingInvoicePayment,
  isCreditCardInvoicePayment,
  isOnCanonicalInvoiceView,
  parseInvoicePaymentCardName,
  parseInvoicePaymentMonthKey,
  resolveInvoicePaymentTarget,
} from './invoice-payment'

const accounts = [
  { id: 'cc-1', name: 'Nubank 6115', type: 'credit_card' },
  { id: 'chk-1', name: 'Nubank', type: 'checking' },
]

describe('parseInvoicePaymentMonthKey', () => {
  it('parses month from standard payment title', () => {
    expect(parseInvoicePaymentMonthKey('Pagamento Fatura Nubank 6115 - junho 2026')).toBe(
      '2026-06'
    )
  })

  it('parses month with em dash separator', () => {
    expect(parseInvoicePaymentMonthKey('Pagamento Fatura Itaú — julho 2026')).toBe('2026-07')
  })

  it('returns null for non-payment titles', () => {
    expect(parseInvoicePaymentMonthKey('Supermercado')).toBeNull()
  })
})

describe('parseInvoicePaymentCardName', () => {
  it('extracts card name from payment title', () => {
    expect(parseInvoicePaymentCardName('Pagamento Fatura Nubank 6115 - junho 2026')).toBe(
      'Nubank 6115'
    )
  })
})

describe('isCreditCardInvoicePayment', () => {
  it('detects credit card invoice payment', () => {
    expect(
      isCreditCardInvoicePayment(
        { type: 'income', title: 'Pagamento Fatura Nubank - junho 2026' },
        'credit_card'
      )
    ).toBe(true)
  })

  it('rejects checking account payment', () => {
    expect(
      isCreditCardInvoicePayment(
        { type: 'expense', title: 'Pagamento Fatura Nubank - junho 2026' },
        'checking'
      )
    ).toBe(false)
  })
})

describe('isCheckingInvoicePayment', () => {
  it('detects checking invoice payment', () => {
    expect(
      isCheckingInvoicePayment(
        { type: 'expense', title: 'Pagamento Fatura Nubank 6115 - junho 2026' },
        'checking'
      )
    ).toBe(true)
  })
})

describe('resolveInvoicePaymentTarget', () => {
  it('returns navigation target for credit card payment', () => {
    expect(
      resolveInvoicePaymentTarget(
        {
          type: 'income',
          title: 'Pagamento Fatura Nubank 6115 - junho 2026',
          accountId: 'cc-1',
        },
        'credit_card',
        accounts
      )
    ).toEqual({
      accountId: 'cc-1',
      monthKey: '2026-06',
      cycleLabel: 'junho 2026',
    })
  })

  it('resolves checking payment via paired transaction', () => {
    expect(
      resolveInvoicePaymentTarget(
        {
          type: 'expense',
          title: 'Pagamento Fatura Nubank 6115 - junho 2026',
          accountId: 'chk-1',
          transferPairId: 'income-1',
        },
        'checking',
        accounts,
        { accountId: 'cc-1', type: 'income' }
      )
    ).toEqual({
      accountId: 'cc-1',
      monthKey: '2026-06',
      cycleLabel: 'junho 2026',
    })
  })

  it('resolves checking payment via title when pair is missing', () => {
    expect(
      resolveInvoicePaymentTarget(
        {
          type: 'expense',
          title: 'Pagamento Fatura Nubank 6115 - junho 2026',
          accountId: 'chk-1',
        },
        'checking',
        accounts
      )
    ).toEqual({
      accountId: 'cc-1',
      monthKey: '2026-06',
      cycleLabel: 'junho 2026',
    })
  })
})

describe('invoicePaymentViewTarget', () => {
  it('returns navigation target for valid payment', () => {
    expect(
      invoicePaymentViewTarget(
        {
          type: 'income',
          title: 'Pagamento Fatura Nubank 6115 - junho 2026',
          accountId: 'cc-1',
        },
        'credit_card'
      )
    ).toEqual({ accountId: 'cc-1', monthKey: '2026-06' })
  })
})

describe('isOnCanonicalInvoiceView', () => {
  it('detects accounts page with matching card and month', () => {
    expect(
      isOnCanonicalInvoiceView(
        '/app/casa/accounts',
        { accountId: 'cc-1', month: '2026-06' },
        { accountId: 'cc-1', monthKey: '2026-06', cycleLabel: 'junho 2026' }
      )
    ).toBe(true)
  })

  it('rejects account detail page', () => {
    expect(
      isOnCanonicalInvoiceView(
        '/app/casa/accounts/cc-1',
        {},
        { accountId: 'cc-1', monthKey: '2026-06', cycleLabel: 'junho 2026' }
      )
    ).toBe(false)
  })
})
