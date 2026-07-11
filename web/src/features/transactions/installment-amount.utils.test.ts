import { describe, expect, it } from 'vitest'

import {
  resolveTransactionInstallmentAmountReais,
  resolveTransactionInstallmentRemainingReais,
  resolveTransactionListAmountReais,
  isTransactionPartiallyPaid,
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
  it('subtracts paid amount from resolved installment amount', () => {
    expect(
      resolveTransactionInstallmentRemainingReais(
        {
          amount: '900.00',
          paidAmount: '100.00',
          installmentNumber: 1,
          installmentsTotal: 3,
        },
        { currentTransactionAmount: '300.00', purchaseTotal: '900.00' }
      )
    ).toBe(200)
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
