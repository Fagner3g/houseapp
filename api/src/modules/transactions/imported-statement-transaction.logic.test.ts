import { describe, expect, it } from 'vitest'

import { assertImportedStatementUpdateAllowed } from './imported-statement-transaction.logic'

const baseTransaction = {
  source: 'import' as const,
  statementId: 'st-1',
  title: 'Mercado',
  amount: 1980n,
  type: 'expense',
  date: new Date('2026-07-03T12:00:00.000Z'),
  competenceDate: new Date('2026-07-03T12:00:00.000Z'),
  accountId: 'acc-1',
  cardId: null,
  counterparty: null,
  installmentNumber: null,
  installmentsTotal: null,
}

describe('assertImportedStatementUpdateAllowed', () => {
  it('allows metadata updates', () => {
    expect(() =>
      assertImportedStatementUpdateAllowed(baseTransaction, {
        description: 'Observação',
      })
    ).not.toThrow()
  })

  it('rejects amount changes', () => {
    expect(() =>
      assertImportedStatementUpdateAllowed(baseTransaction, { amount: '20.00' })
    ).toThrow('Imported statement lines cannot change amount')
  })

  it('rejects account changes', () => {
    expect(() =>
      assertImportedStatementUpdateAllowed(baseTransaction, { accountId: 'acc-2' })
    ).toThrow('Imported statement lines cannot change account')
  })

  it('allows manual transaction updates', () => {
    expect(() =>
      assertImportedStatementUpdateAllowed(
        { ...baseTransaction, source: 'manual', statementId: null },
        { amount: '20.00' }
      )
    ).not.toThrow()
  })
})
