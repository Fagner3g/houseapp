import { describe, expect, it } from 'vitest'

import {
  assignStatementExternalIds,
  buildStatementExternalId,
} from './statement-transaction-external-id'

describe('statement-transaction-external-id', () => {
  it('assigns stable external ids with ordinals for repeated lines', () => {
    const base = {
      date: '2026-07-01T12:00:00.000Z',
      title: 'iFood - NuPay',
      amount: '0.90',
      type: 'expense' as const,
    }

    const transactions = assignStatementExternalIds([
      base,
      { ...base, type: 'income' },
      base,
    ])

    expect(transactions[0]!.externalId).toHaveLength(64)
    expect(transactions[1]!.externalId).not.toBe(transactions[0]!.externalId)
    expect(transactions[2]!.externalId).not.toBe(transactions[0]!.externalId)
    expect(transactions[2]!.externalId).toBe(
      buildStatementExternalId(base, 2)
    )
  })

  it('includes installment numbers in the fingerprint', () => {
    const withInstallment = {
      date: '2026-06-18T12:00:00.000Z',
      title: 'Lojas Renner Fl - Parcela 1/3',
      amount: '73.28',
      type: 'expense' as const,
      installmentNumber: 1,
      installmentsTotal: 3,
    }

    const withoutInstallment = {
      date: '2026-06-18T12:00:00.000Z',
      title: 'Lojas Renner Fl',
      amount: '73.28',
      type: 'expense' as const,
    }

    const [a] = assignStatementExternalIds([withInstallment])
    const [b] = assignStatementExternalIds([withoutInstallment])

    expect(a!.externalId).not.toBe(b!.externalId)
  })
})
