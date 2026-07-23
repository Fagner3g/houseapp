import { describe, expect, it } from 'vitest'

import {
  resolveSettlementPrefillReais,
  resolveTransactionInstallmentAmountReais,
  resolveTransactionInstallmentRemainingReais,
  resolveTransactionListAmountReais,
  isTransactionPartiallyPaid,
  isTransactionReminderWithoutValue,
  transactionRemainingReais,
} from './installment-amount.utils'

describe('resolveTransactionInstallmentAmountReais', () => {
  it('uses summary currentTransactionAmount when available', () => {
    expect(
      resolveTransactionInstallmentAmountReais(
        {
          amount: '900.00',
          installmentNumber: 1,
          installmentsTotal: 3,
        },
        { currentTransactionAmount: '300.00', purchaseTotal: '900.00' }
      )
    ).toBe(300)
  })

  it('divides purchase total when only one row stores the full amount', () => {
    expect(
      resolveTransactionInstallmentAmountReais({
        amount: '900.00',
        installmentNumber: 1,
        installmentsTotal: 3,
        source: 'manual',
      })
    ).toBe(300)
  })

  it('keeps recurring occurrence amount as the installment', () => {
    expect(
      resolveTransactionInstallmentAmountReais({
        amount: '421.11',
        installmentNumber: 1,
        installmentsTotal: 4,
        source: 'recurring',
      })
    ).toBe(421.11)
  })

  it('returns row amount for non-installment transactions', () => {
    expect(
      resolveTransactionInstallmentAmountReais({
        amount: '150.00',
        installmentNumber: null,
        installmentsTotal: null,
      })
    ).toBe(150)
  })
})

describe('resolveTransactionInstallmentRemainingReais', () => {
  it('uses row remaining even when installment amount is a divided slice', () => {
    expect(
      resolveTransactionInstallmentRemainingReais(
        {
          amount: '400.00',
          paidAmount: '200.00',
          installmentNumber: 1,
          installmentsTotal: 2,
          source: 'manual',
        },
        { currentTransactionAmount: '200.00', purchaseTotal: '400.00' }
      )
    ).toBe(200)
  })

  it('matches amount − paid for a materialized parcel row', () => {
    expect(
      resolveTransactionInstallmentRemainingReais({
        amount: '300.00',
        paidAmount: '100.00',
        installmentNumber: 1,
        installmentsTotal: 3,
      })
    ).toBe(200)
  })
})

describe('resolveSettlementPrefillReais', () => {
  it('prefers one parcel when the row still holds the purchase total', () => {
    expect(
      resolveSettlementPrefillReais({
        amount: '400.00',
        paidAmount: '0.00',
        installmentNumber: 1,
        installmentsTotal: 2,
        source: 'manual',
      })
    ).toBe(200)
  })

  it('caps prefill at row remaining after a partial settlement', () => {
    expect(
      resolveSettlementPrefillReais({
        amount: '400.00',
        paidAmount: '200.00',
        installmentNumber: 1,
        installmentsTotal: 2,
        source: 'manual',
      })
    ).toBe(200)
  })

  it('returns 0 when the row is fully settled', () => {
    expect(
      resolveSettlementPrefillReais({
        amount: '400.00',
        paidAmount: '400.00',
        installmentNumber: 1,
        installmentsTotal: 2,
        source: 'manual',
      })
    ).toBe(0)
  })
})

describe('transactionRemainingReais', () => {
  it('returns remaining balance from raw amounts', () => {
    expect(transactionRemainingReais('300.00', '100.00')).toBe(200)
  })
})

describe('resolveTransactionListAmountReais', () => {
  it('subtracts transaction and split payments from the listed amount', () => {
    expect(resolveTransactionListAmountReais('4000.00', '0.00', 3000)).toBe(1000)
  })

  it('never returns a negative amount', () => {
    expect(resolveTransactionListAmountReais('4000.00', '4000.00', 500)).toBe(0)
  })
})

describe('isTransactionPartiallyPaid', () => {
  it('returns true when split payments cover part of the amount', () => {
    expect(isTransactionPartiallyPaid('4000.00', '0.00', 3000)).toBe(true)
  })

  it('returns false when nothing was paid yet', () => {
    expect(isTransactionPartiallyPaid('4000.00', '0.00', 0)).toBe(false)
  })

  it('returns false when the transaction is fully paid', () => {
    expect(isTransactionPartiallyPaid('4000.00', '4000.00', 0)).toBe(false)
  })
})

describe('isTransactionReminderWithoutValue', () => {
  it('treats null, empty and zero amounts as without value', () => {
    expect(isTransactionReminderWithoutValue(null)).toBe(true)
    expect(isTransactionReminderWithoutValue(undefined)).toBe(true)
    expect(isTransactionReminderWithoutValue('')).toBe(true)
    expect(isTransactionReminderWithoutValue('0.00')).toBe(true)
  })

  it('treats positive amounts as known value', () => {
    expect(isTransactionReminderWithoutValue('10.00')).toBe(false)
  })
})
