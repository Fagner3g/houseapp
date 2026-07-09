import { describe, expect, it } from 'vitest'

import { buildStatementImportSummary } from '@/modules/statements/statement-import-summary'
import type { ImportStatementBody } from '@/modules/statements/statement.schema'

describe('buildStatementImportSummary', () => {
  it('aggregates expenses, income and installments', () => {
    const parsed: ImportStatementBody = {
      fileHash: 'a'.repeat(64),
      fileName: 'fatura.pdf',
      periodStart: '2026-05-01T00:00:00.000Z',
      periodEnd: '2026-06-01T00:00:00.000Z',
      closingDate: '2026-06-01T00:00:00.000Z',
      dueDate: '2026-06-08T00:00:00.000Z',
      totalAmount: '100.00',
      transactions: [
        {
          title: 'Compra',
          amount: '80.00',
          date: '2026-05-10T00:00:00.000Z',
          type: 'expense',
          installmentNumber: 1,
          installmentsTotal: 3,
        },
        {
          title: 'Pagamento',
          amount: '20.00',
          date: '2026-05-11T00:00:00.000Z',
          type: 'income',
        },
      ],
    }

    const summary = buildStatementImportSummary(parsed)

    expect(summary.expensesCount).toBe(1)
    expect(summary.expensesTotal).toBe('80.00')
    expect(summary.incomeCount).toBe(1)
    expect(summary.incomeTotal).toBe('20.00')
    expect(summary.installmentCount).toBe(1)
    expect(summary.previewTransactions[0]?.installmentLabel).toBe('1/3')
  })
})
