import { describe, expect, it } from 'vitest'

import {
  computeTransactionStatus,
  isReminderWithoutValue,
  isUnpaidTransactionStatus,
  transactionRemainingAmount,
} from './transaction-payment'

describe('transaction-payment', () => {
  it('computes pending, partial and paid statuses', () => {
    expect(computeTransactionStatus(10000n, 0n, 'pending')).toBe('pending')
    expect(computeTransactionStatus(10000n, 5000n, 'pending')).toBe('partial')
    expect(computeTransactionStatus(10000n, 10000n, 'partial')).toBe('paid')
    expect(computeTransactionStatus(10000n, 15000n, 'partial')).toBe('paid')
    expect(computeTransactionStatus(10000n, 0n, 'canceled')).toBe('canceled')
  })

  it('marks reminder-without-value as paid when any amount is paid', () => {
    expect(computeTransactionStatus(null, 15000n, 'pending')).toBe('paid')
    expect(computeTransactionStatus(0n, 8900n, 'pending')).toBe('paid')
    expect(computeTransactionStatus(null, 0n, 'pending')).toBe('pending')
  })

  it('detects reminder-without-value amounts', () => {
    expect(isReminderWithoutValue(null)).toBe(true)
    expect(isReminderWithoutValue(0n)).toBe(true)
    expect(isReminderWithoutValue(-1n)).toBe(true)
    expect(isReminderWithoutValue(1n)).toBe(false)
  })

  it('treats partial as unpaid', () => {
    expect(isUnpaidTransactionStatus('pending')).toBe(true)
    expect(isUnpaidTransactionStatus('partial')).toBe(true)
    expect(isUnpaidTransactionStatus('paid')).toBe(false)
  })

  it('computes remaining amount', () => {
    expect(transactionRemainingAmount(10000n, 0n)).toBe(10000n)
    expect(transactionRemainingAmount(10000n, 3000n)).toBe(7000n)
    expect(transactionRemainingAmount(10000n, 10000n)).toBe(0n)
    expect(transactionRemainingAmount(10000n, 12000n)).toBe(0n)
  })
})
