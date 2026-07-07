import { describe, expect, it } from 'vitest'

import type { GetInstallmentSeries200InstallmentsItem } from '@/api/generated/model/getInstallmentSeries200InstallmentsItem'

import { computeAdvancePaymentTotalReais } from './advance-installments-picker'

const installments: GetInstallmentSeries200InstallmentsItem[] = [
  {
    id: 'tx-1',
    installmentNumber: 1,
    date: '2026-07-15T00:00:00.000Z',
    amount: '300.00',
    paidAmount: '0.00',
    remaining: '300.00',
    status: 'pending',
  },
  {
    id: 'tx-2',
    installmentNumber: 2,
    date: '2026-08-15T00:00:00.000Z',
    amount: '300.00',
    paidAmount: '0.00',
    remaining: '300.00',
    status: 'pending',
  },
  {
    id: 'tx-3',
    installmentNumber: 3,
    date: '2026-09-15T00:00:00.000Z',
    amount: '300.00',
    paidAmount: '0.00',
    remaining: '300.00',
    status: 'pending',
  },
]

describe('computeAdvancePaymentTotalReais', () => {
  it('sums current remaining with selected future installments', () => {
    expect(computeAdvancePaymentTotalReais(300, installments, ['tx-2'])).toBe(600)
    expect(computeAdvancePaymentTotalReais(300, installments, ['tx-2', 'tx-3'])).toBe(900)
  })
})
