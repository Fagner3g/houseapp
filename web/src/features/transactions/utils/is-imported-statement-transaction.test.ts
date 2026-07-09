import { describe, expect, it } from 'vitest'

import { isImportedStatementTransaction } from './is-imported-statement-transaction'

describe('isImportedStatementTransaction', () => {
  it('returns true for imported statement lines', () => {
    expect(
      isImportedStatementTransaction({ source: 'import', statementId: 'st-1' })
    ).toBe(true)
  })

  it('returns false for manual transactions', () => {
    expect(isImportedStatementTransaction({ source: 'manual', statementId: null })).toBe(false)
  })

  it('returns false for import without statement link', () => {
    expect(isImportedStatementTransaction({ source: 'import', statementId: null })).toBe(false)
  })
})
