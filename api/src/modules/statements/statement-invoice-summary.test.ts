import { describe, expect, it } from 'vitest'

import { deriveImportedStatementSummary, resolveImportedSummaryForImport } from './statement-invoice-summary'

describe('resolveImportedSummaryForImport', () => {
  it('derives summary for closed imports when fields are missing', () => {
    const summary = resolveImportedSummaryForImport({
      isClosed: true,
      totalAmount: '5828.83',
      periodStart: '2026-03-01T12:00:00.000Z',
      periodEnd: '2026-04-01T12:00:00.000Z',
      dueDate: '2026-04-08T12:00:00.000Z',
      transactions: [
        { type: 'expense', amount: '5836.51', date: '2026-03-15T12:00:00.000Z' },
      ],
    })

    expect(summary.purchasesTotal).toBe('5836.51')
    expect(summary.previousBalance).toBe('0.00')
  })

  it('keeps partial imports open without deriving summary', () => {
    const summary = resolveImportedSummaryForImport({
      isClosed: false,
      totalAmount: '100.00',
      periodStart: '2026-03-01T12:00:00.000Z',
      periodEnd: '2026-04-01T12:00:00.000Z',
      dueDate: '2026-04-08T12:00:00.000Z',
      transactions: [],
    })

    expect(summary.purchasesTotal).toBeNull()
    expect(summary.previousBalance).toBeNull()
  })
})

describe('deriveImportedStatementSummary', () => {
  it('derives previous balance from total minus purchases in OFX period', () => {
    const summary = deriveImportedStatementSummary({
      totalAmount: '6751.33',
      periodStart: '2026-06-01T12:00:00.000Z',
      periodEnd: '2026-07-10T12:00:00.000Z',
      dueDate: '2026-07-17T12:00:00.000Z',
      transactions: [
        {
          type: 'expense',
          amount: '100.00',
          date: '2026-06-05T12:00:00.000Z',
        },
        {
          type: 'expense',
          amount: '50.00',
          date: '2026-07-05T12:00:00.000Z',
        },
        {
          type: 'income',
          amount: '20.00',
          date: '2026-07-12T12:00:00.000Z',
        },
      ],
    })

    expect(summary.purchasesTotal).toBe('150.00')
    expect(summary.paymentsReceived).toBe('20.00')
    expect(summary.previousBalance).toBe('6601.33')
  })
})
