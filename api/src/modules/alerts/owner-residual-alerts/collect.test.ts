import { describe, expect, it } from 'vitest'

import { collectOwnerResidualAlerts } from './collect'
import { residualCcTx, residualTx } from './test-fixtures'

describe('collectOwnerResidualAlerts', () => {
  it('groups credit-card purchases into one invoice and keeps non-CC as items', () => {
    const collected = collectOwnerResidualAlerts(
      [
        residualCcTx({ id: 'cc-1', title: 'Uber', amount: 3000n }),
        residualCcTx({ id: 'cc-2', title: 'iFood', amount: 7000n }),
        residualTx({
          id: 'bill-1',
          title: 'DARF',
          date: new Date('2026-06-01T15:00:00.000Z'),
          amount: 15000n,
        }),
      ],
      new Set(),
      new Date('2026-07-11T15:00:00.000Z')
    )

    expect(collected.invoices).toHaveLength(1)
    expect(collected.invoices[0].accountName).toBe('Nubank')
    expect(collected.invoices[0].remainingCentavos).toBe(10000n)
    expect(collected.invoices[0].transactionIds).toEqual(['cc-1', 'cc-2'])
    expect(collected.transactions).toHaveLength(1)
    expect(collected.transactions[0].transaction.id).toBe('bill-1')
  })

  it('excludes delegated splits and notify-enabled transactions', () => {
    const collected = collectOwnerResidualAlerts(
      [
        residualCcTx({ id: 'delegated', title: 'Celular', amount: 20000n }),
        residualCcTx({ id: 'kept', title: 'Mercado', amount: 4000n }),
        residualTx({ id: 'opt-in', title: 'Aluguel', notifyEnabled: true, amount: 90000n }),
        residualTx({ id: 'zero', title: 'Pago', amount: 1000n, paidAmount: 1000n }),
      ],
      new Set(['delegated']),
      new Date('2026-07-11T15:00:00.000Z')
    )

    expect(collected.invoices).toHaveLength(1)
    expect(collected.invoices[0].transactionIds).toEqual(['kept'])
    expect(collected.invoices[0].remainingCentavos).toBe(4000n)
    expect(collected.transactions).toHaveLength(0)
  })

  it('skips invoice groups with zero remaining', () => {
    const collected = collectOwnerResidualAlerts(
      [residualCcTx({ id: 'paid', title: 'Pago', amount: 5000n, paidAmount: 5000n })],
      new Set(),
      new Date('2026-07-11T15:00:00.000Z')
    )

    expect(collected.invoices).toHaveLength(0)
  })

  it('includes reminder-without-value (null/zero amount) as non-CC residual', () => {
    const collected = collectOwnerResidualAlerts(
      [
        residualTx({
          id: 'das',
          title: 'DAS',
          amount: null,
          date: new Date('2026-07-10T03:00:00.000Z'),
        }),
        residualTx({
          id: 'zero',
          title: 'Taxa',
          amount: 0n,
          date: new Date('2026-07-12T12:00:00.000Z'),
        }),
      ],
      new Set(),
      new Date('2026-07-11T15:00:00.000Z')
    )

    expect(collected.transactions.map(alert => alert.transaction.id).sort()).toEqual([
      'das',
      'zero',
    ])
    expect(collected.transactions.every(alert => alert.remainingCentavos === 0n)).toBe(true)
  })

  it('excludes future-month invoices but keeps current and overdue past', () => {
    const collected = collectOwnerResidualAlerts(
      [
        residualCcTx({
          id: 'july',
          title: 'Mercado',
          amount: 4000n,
          date: new Date('2026-06-15T15:00:00.000Z'),
          competenceDate: new Date('2026-06-15T15:00:00.000Z'),
        }),
        residualCcTx({
          id: 'august',
          title: 'Netflix',
          amount: 5000n,
          date: new Date('2026-07-15T15:00:00.000Z'),
          competenceDate: new Date('2026-07-15T15:00:00.000Z'),
        }),
        residualTx({
          id: 'june-bill',
          title: 'DARF',
          date: new Date('2026-06-01T15:00:00.000Z'),
          amount: 15000n,
        }),
      ],
      new Set(),
      new Date('2026-07-11T15:00:00.000Z')
    )

    expect(collected.invoices.map(invoice => invoice.monthKey)).toEqual(['2026-07'])
    expect(collected.transactions.map(alert => alert.transaction.id)).toEqual(['june-bill'])
  })
})
