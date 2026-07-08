import { describe, expect, it } from 'vitest'

import { annotateTransactionDuplicates } from './statement-duplicate-detection'
import { assignStatementExternalIds } from './statement-transaction-external-id'

function buildSampleTransactions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    title: `Merchant ${index + 1}`,
    amount: `${(index + 1) * 10}.00`,
    date: `2026-06-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
    type: 'expense' as const,
  }))
}

describe('statement reimport flow', () => {
  it('reuses external ids for overlapping statement rows', () => {
    const partial = assignStatementExternalIds(buildSampleTransactions(10))
    const extended = assignStatementExternalIds(buildSampleTransactions(15))

    const partialIds = new Set(partial.map(tx => tx.externalId))
    const overlap = extended.filter(tx => partialIds.has(tx.externalId))

    expect(partial.length).toBe(10)
    expect(overlap.length).toBe(partial.length)
    expect(extended.length).toBeGreaterThan(partial.length)
  })

  it('detects duplicates when re-parsing an extended export', () => {
    const partial = assignStatementExternalIds(buildSampleTransactions(10))
    const extended = assignStatementExternalIds(buildSampleTransactions(15))

    const existingExternalIds = new Set(partial.map(tx => tx.externalId))

    const annotated = annotateTransactionDuplicates(
      extended,
      existingExternalIds,
      partial.map((tx, index) => ({
        id: `existing-${index}`,
        title: tx.title,
        amount: BigInt(Math.round(Number.parseFloat(tx.amount) * 100)),
        date: new Date(tx.date),
        externalId: tx.externalId,
      }))
    )

    expect(annotated.filter(tx => tx.isDuplicate).length).toBe(partial.length)
    expect(annotated.filter(tx => !tx.isDuplicate).length).toBe(
      extended.length - partial.length
    )
  })

  it('keeps external ids stable for identical rows', () => {
    const row = {
      title: 'Lojas Renner Fl - Parcela 1/3',
      amount: '73.28',
      date: '2026-06-18T12:00:00.000Z',
      type: 'expense' as const,
      installmentNumber: 1,
      installmentsTotal: 3,
    }

    const [first] = assignStatementExternalIds([row])
    const [second] = assignStatementExternalIds([row])

    const firstRow = first as NonNullable<typeof first>
    const secondRow = second as NonNullable<typeof second>
    expect(firstRow.externalId).toBe(secondRow.externalId)
  })
})
