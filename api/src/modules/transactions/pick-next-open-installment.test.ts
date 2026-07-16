import { describe, expect, it } from 'vitest'

import { pickNextOpenInstallment } from './pick-next-open-installment'

describe('pickNextOpenInstallment', () => {
  const rows = [
    {
      id: '1',
      installmentNumber: 1,
      status: 'pending',
      amount: 40000n,
      paidAmount: null as bigint | null,
    },
    {
      id: '2',
      installmentNumber: 2,
      status: 'pending',
      amount: 40000n,
      paidAmount: null as bigint | null,
    },
    {
      id: '3',
      installmentNumber: 3,
      status: 'paid',
      amount: 40000n,
      paidAmount: 40000n as bigint | null,
    },
  ]

  it('returns the next unpaid after current', () => {
    expect(pickNextOpenInstallment(rows, 1)?.id).toBe('2')
  })

  it('skips paid siblings', () => {
    expect(pickNextOpenInstallment(rows, 2)).toBeUndefined()
  })
})
