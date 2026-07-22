import { describe, expect, it } from 'vitest'

import {
  receivablesFromPendingSplits,
  receivableByMonthKey,
} from '@/lib/credit-card-overdue-invoice-rows'
import { getSplitRemainingReais } from '../split-debt-summary.utils'

describe('receivablesFromPendingSplits', () => {
  it('keeps only credit-card splits with remaining balance', () => {
    const rows = receivablesFromPendingSplits(
      [
        {
          transactionId: 'tx-1',
          accountId: 'cc-1',
          accountType: 'credit_card',
          transactionDate: '2026-06-16T12:00:00.000Z',
          amount: '1350.00',
          paidAmount: '0.00',
        },
        {
          transactionId: 'tx-2',
          accountId: 'chk-1',
          accountType: 'checking',
          transactionDate: '2026-06-16T12:00:00.000Z',
          amount: '100.00',
          paidAmount: '0.00',
        },
        {
          transactionId: 'tx-3',
          accountId: 'cc-1',
          accountType: 'credit_card',
          transactionDate: '2026-06-16T12:00:00.000Z',
          amount: '50.00',
          paidAmount: '50.00',
        },
      ],
      (amount, paidAmount) => getSplitRemainingReais({ amount, paidAmount })
    )

    expect(rows).toEqual([
      {
        transactionId: 'tx-1',
        accountId: 'cc-1',
        purchaseDate: '2026-06-16T12:00:00.000Z',
        remainingReais: 1350,
      },
    ])
  })

  it('keeps credit-card splits when accountType is missing but account id is known', () => {
    const rows = receivablesFromPendingSplits(
      [
        {
          transactionId: 'tx-1',
          accountId: 'cc-1',
          accountType: null,
          transactionDate: '2026-06-16T12:00:00.000Z',
          amount: '1350.00',
          paidAmount: '0.00',
        },
      ],
      (amount, paidAmount) => getSplitRemainingReais({ amount, paidAmount }),
      new Set(['cc-1'])
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.remainingReais).toBe(1350)
  })
})

describe('receivableByMonthKey', () => {
  it('maps June purchase on closing day 9 into July invoice month', () => {
    const byMonth = receivableByMonthKey(
      {
        id: 'cc-1',
        name: 'Nubank - Empresa',
        type: 'credit_card',
        closingDay: 9,
        dueDay: 16,
      },
      [
        {
          transactionId: 'tx-1',
          accountId: 'cc-1',
          purchaseDate: '2026-06-16T12:00:00.000Z',
          remainingReais: 1350,
        },
      ]
    )

    expect(byMonth.get('2026-07')).toBe(1350)
  })
})
