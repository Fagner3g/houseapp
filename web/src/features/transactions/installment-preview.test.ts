import { describe, expect, it } from 'vitest'

import { buildInstallmentPreview, divideReais } from './installment-preview'

describe('divideReais', () => {
  it('splits evenly', () => {
    expect(divideReais(900, 4)).toEqual([225, 225, 225, 225])
  })

  it('distributes remainder to first installments', () => {
    expect(divideReais(900.01, 4)).toEqual([225.01, 225, 225, 225])
  })
})

describe('buildInstallmentPreview', () => {
  it('shows invoice months for credit card installments', () => {
    const items = buildInstallmentPreview({
      totalAmount: 900,
      installmentsTotal: 4,
      startDate: '2026-07-02',
      periodicity: 'monthly-1',
      isCreditCardExpense: true,
      account: { type: 'credit_card', closingDay: 1, dueDay: 18 },
    })

    expect(items).toHaveLength(4)
    expect(items?.[0]).toMatchObject({
      installmentNumber: 1,
      amount: 225,
      label: 'Fatura de Agosto/2026',
    })
    expect(items?.[1]?.label).toBe('Fatura de Setembro/2026')
    expect(items?.[3]?.label).toBe('Fatura de Novembro/2026')
  })

  it('shows shifted dates for non-credit accounts', () => {
    const items = buildInstallmentPreview({
      totalAmount: 900,
      installmentsTotal: 4,
      startDate: '2026-07-06',
      periodicity: 'monthly-1',
      account: { type: 'checking' },
    })

    expect(items).toHaveLength(4)
    expect(items?.[0]?.label).toBe('06/07/2026')
    expect(items?.[1]?.label).toBe('06/08/2026')
    expect(items?.[3]?.label).toBe('06/10/2026')
  })

  it('shows my share per installment when purchase is split 50%', () => {
    const items = buildInstallmentPreview({
      totalAmount: 900,
      installmentsTotal: 4,
      startDate: '2026-07-15',
      periodicity: 'monthly-1',
      account: { type: 'checking' },
      split: { splitMode: 'half', splitAmountReais: 450 },
    })

    expect(items?.[0]).toMatchObject({
      amount: 225,
      myShareAmount: 112.5,
      splitAmount: 112.5,
    })
    expect(items?.[3]?.myShareAmount).toBe(112.5)
  })

  it('distributes custom split amount across installments', () => {
    const items = buildInstallmentPreview({
      totalAmount: 900,
      installmentsTotal: 4,
      startDate: '2026-07-15',
      periodicity: 'monthly-1',
      account: { type: 'checking' },
      split: { splitMode: 'custom', splitAmountReais: 450 },
    })

    expect(items?.map(item => item.splitAmount)).toEqual([112.5, 112.5, 112.5, 112.5])
    expect(items?.map(item => item.myShareAmount)).toEqual([112.5, 112.5, 112.5, 112.5])
  })
})
