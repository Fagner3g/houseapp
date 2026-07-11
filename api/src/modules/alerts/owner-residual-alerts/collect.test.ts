import { describe, expect, it } from 'vitest'

import { collectOwnerResidualAlerts } from './collect'
import { buildOwnerResidualCreateInputs } from './evaluate'
import type { ResidualTransaction } from './types'
import type { AlertRuleLike } from '../alert-rule-config'

function tx(overrides: Partial<ResidualTransaction> & { id: string }): ResidualTransaction {
  return {
    organizationId: 'org-1',
    accountId: null,
    accountName: null,
    title: 'Despesa',
    amount: 10000n,
    paidAmount: 0n,
    date: new Date('2026-07-01T15:00:00.000Z'),
    competenceDate: null,
    type: 'expense',
    installmentNumber: null,
    accountType: 'checking',
    closingDay: null,
    dueDay: null,
    notifyEnabled: false,
    ...overrides,
  }
}

function ccTx(
  overrides: Partial<ResidualTransaction> & { id: string; title: string }
): ResidualTransaction {
  return tx({
    accountId: 'card-1',
    accountName: 'Nubank',
    accountType: 'credit_card',
    closingDay: 1,
    dueDay: 10,
    date: new Date('2026-06-15T15:00:00.000Z'),
    competenceDate: new Date('2026-06-15T15:00:00.000Z'),
    amount: 5000n,
    ...overrides,
  })
}

const upcomingRule: AlertRuleLike = {
  id: 'rule-up',
  organizationId: 'org-1',
  scope: 'organization',
  accountId: null,
  recurringTransactionId: null,
  triggerType: 'upcoming',
  config: { daysBefore: [1, 3, 7] },
  channels: ['whatsapp'],
  isActive: true,
  createdBy: 'owner',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const overdueRule: AlertRuleLike = {
  id: 'rule-od',
  organizationId: 'org-1',
  scope: 'organization',
  accountId: null,
  recurringTransactionId: null,
  triggerType: 'overdue',
  config: { frequency: 'daily', interval: 1 },
  channels: ['whatsapp'],
  isActive: true,
  createdBy: 'owner',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('collectOwnerResidualAlerts', () => {
  it('groups credit-card purchases into one invoice and keeps non-CC as items', () => {
    const collected = collectOwnerResidualAlerts(
      [
        ccTx({ id: 'cc-1', title: 'Uber', amount: 3000n }),
        ccTx({ id: 'cc-2', title: 'iFood', amount: 7000n }),
        tx({
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
        ccTx({ id: 'delegated', title: 'Celular', amount: 20000n }),
        ccTx({ id: 'kept', title: 'Mercado', amount: 4000n }),
        tx({ id: 'opt-in', title: 'Aluguel', notifyEnabled: true, amount: 90000n }),
        tx({ id: 'zero', title: 'Pago', amount: 1000n, paidAmount: 1000n }),
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
      [ccTx({ id: 'paid', title: 'Pago', amount: 5000n, paidAmount: 5000n })],
      new Set(),
      new Date('2026-07-11T15:00:00.000Z')
    )

    expect(collected.invoices).toHaveLength(0)
  })

  it('includes reminder-without-value (null/zero amount) as non-CC residual', () => {
    const collected = collectOwnerResidualAlerts(
      [
        tx({
          id: 'das',
          title: 'DAS',
          amount: null,
          date: new Date('2026-07-10T03:00:00.000Z'),
        }),
        tx({
          id: 'zero',
          title: 'Taxa',
          amount: 0n,
          date: new Date('2026-07-12T12:00:00.000Z'),
        }),
      ],
      new Set(),
      new Date('2026-07-11T15:00:00.000Z')
    )

    expect(collected.transactions.map(alert => alert.transaction.id).sort()).toEqual(['das', 'zero'])
    expect(collected.transactions.every(alert => alert.remainingCentavos === 0n)).toBe(true)
  })

  it('excludes future-month invoices but keeps current and overdue past', () => {
    const collected = collectOwnerResidualAlerts(
      [
        ccTx({
          id: 'july',
          title: 'Mercado',
          amount: 4000n,
          date: new Date('2026-06-15T15:00:00.000Z'),
          competenceDate: new Date('2026-06-15T15:00:00.000Z'),
        }),
        ccTx({
          id: 'august',
          title: 'Netflix',
          amount: 5000n,
          date: new Date('2026-07-15T15:00:00.000Z'),
          competenceDate: new Date('2026-07-15T15:00:00.000Z'),
        }),
        tx({
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

describe('buildOwnerResidualCreateInputs', () => {
  it('emits one invoice_overdue input without purchase line metadata', () => {
    const collected = collectOwnerResidualAlerts(
      [
        ccTx({ id: 'cc-1', title: 'Uber', amount: 3000n }),
        ccTx({ id: 'cc-2', title: 'iFood', amount: 7000n }),
      ],
      new Set(),
      new Date('2026-07-11T15:00:00.000Z')
    )

    const inputs = buildOwnerResidualCreateInputs({
      mode: 'overdue',
      rules: [upcomingRule, overdueRule],
      invoices: collected.invoices,
      transactions: collected.transactions,
    })

    expect(inputs).toHaveLength(1)
    expect(inputs[0].transactionId).toBeNull()
    expect(inputs[0].metadata.kind).toBe('invoice_overdue')
    expect(inputs[0].metadata.amount).toBe('100.00')
    expect(inputs[0].title).toContain('Fatura Nubank')
  })
})
