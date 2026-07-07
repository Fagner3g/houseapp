import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

import {
  isCreditCardInvoiceAlert,
  resolveSplitAlertDueDate,
  resolveTransactionAlertDueDate,
} from './resolve-transaction-alert-due-date'

describe('resolveTransactionAlertDueDate', () => {
  it('uses invoice due date for credit card purchases', () => {
    const dueDate = resolveTransactionAlertDueDate({
      date: new Date('2026-07-02T12:00:00.000Z'),
      competenceDate: new Date('2026-07-02T12:00:00.000Z'),
      installmentNumber: 1,
      type: 'expense',
      accountType: 'credit_card',
      closingDay: 1,
      dueDay: 18,
    })

    expect(dayjs(dueDate).format('YYYY-MM-DD')).toBe('2026-08-18')
  })

  it('uses due date (vencimento) for non credit card transactions', () => {
    const dueDate = resolveTransactionAlertDueDate({
      date: new Date('2026-06-16T12:00:00.000Z'),
      competenceDate: new Date('2026-07-06T12:00:00.000Z'),
      type: 'expense',
      accountType: 'checking',
    })

    expect(dayjs(dueDate).format('YYYY-MM-DD')).toBe('2026-06-16')
  })

  it('uses invoice due date for credit card split purchases', () => {
    const dueDate = resolveSplitAlertDueDate({
      transactionDate: new Date('2026-07-05T12:00:00.000Z'),
      competenceDate: new Date('2026-07-05T12:00:00.000Z'),
      installmentNumber: 1,
      type: 'expense',
      accountType: 'credit_card',
      closingDay: 10,
      dueDay: 17,
    })

    expect(dayjs(dueDate).format('YYYY-MM-DD')).toBe('2026-07-17')
  })

  it('detects credit card invoice alerts', () => {
    expect(
      isCreditCardInvoiceAlert({
        date: new Date(),
        type: 'expense',
        accountType: 'credit_card',
      })
    ).toBe(true)
  })
})
