import { describe, expect, it } from 'vitest'

import {
  resolveTransactionInstallmentAmountReais,
  resolveTransactionInstallmentRemainingReais,
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
      })
    ).toBe(300)
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
