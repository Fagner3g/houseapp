import { describe, expect, it } from 'vitest'

import { collectOwnerResidualAlerts } from './collect'
import { buildOwnerResidualCreateInputs } from './evaluate'
import {
  residualCcTx,
  residualOverdueRule,
  residualTx,
  residualUpcomingRule,
} from './test-fixtures'

describe('buildOwnerResidualCreateInputs', () => {
  it('emits one invoice_overdue input without purchase line metadata', () => {
    const collected = collectOwnerResidualAlerts(
      [
        residualCcTx({ id: 'cc-1', title: 'Uber', amount: 3000n }),
        residualCcTx({ id: 'cc-2', title: 'iFood', amount: 7000n }),
      ],
      new Set(),
      new Date('2026-07-11T15:00:00.000Z')
    )

    const inputs = buildOwnerResidualCreateInputs({
      mode: 'overdue',
      rules: [residualUpcomingRule, residualOverdueRule],
      invoices: collected.invoices,
      transactions: collected.transactions,
      orgOwnerId: 'org-owner',
    })

    expect(inputs).toHaveLength(1)
    expect(inputs[0].transactionId).toBeNull()
    expect(inputs[0].recipientUserId).toBe('org-owner')
    expect(inputs[0].metadata.kind).toBe('invoice_overdue')
    expect(inputs[0].metadata.amount).toBe('100.00')
    expect(inputs[0].title).toContain('Fatura Nubank')
  })

  it('routes invoice residual to account creator and tx residual to transaction creator', () => {
    const collected = collectOwnerResidualAlerts(
      [
        residualCcTx({
          id: 'cc-1',
          title: 'Uber',
          amount: 3000n,
          accountCreatedBy: 'aline',
        }),
        residualTx({
          id: 'bill-1',
          title: 'DARF',
          date: new Date('2026-06-01T15:00:00.000Z'),
          amount: 15000n,
          transactionCreatedBy: 'aline',
        }),
      ],
      new Set(),
      new Date('2026-07-11T15:00:00.000Z')
    )

    const inputs = buildOwnerResidualCreateInputs({
      mode: 'overdue',
      rules: [residualUpcomingRule, residualOverdueRule],
      invoices: collected.invoices,
      transactions: collected.transactions,
      orgOwnerId: 'fagner',
    })

    expect(inputs.map(input => input.recipientUserId).sort()).toEqual(['aline', 'aline'])
  })
})
