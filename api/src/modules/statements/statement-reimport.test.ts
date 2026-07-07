import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { annotateTransactionDuplicates } from './statement-duplicate-detection'
import { parseNubankCsv } from './nubank-csv-parser'
import { assignStatementExternalIds } from './statement-transaction-external-id'

const fixturePath = resolve(import.meta.dirname, 'fixtures/nubank-2026-07-17.csv')

describe('statement reimport flow', () => {
  it('reuses external ids for overlapping csv rows', () => {
    const content = readFileSync(fixturePath, 'utf8')
    const lines = content.trim().split('\n')

    const partialContent = [lines[0], ...lines.slice(1, 11)].join('\n')
    const extendedContent = [lines[0], ...lines.slice(1, 16)].join('\n')

    const partial = parseNubankCsv({
      content: partialContent,
      fileName: 'partial.csv',
      closingDay: 1,
      dueDay: 8,
    })

    const extended = parseNubankCsv({
      content: extendedContent,
      fileName: 'extended.csv',
      closingDay: 1,
      dueDay: 8,
    })

    const partialIds = new Set(
      partial.parsed.transactions.map(tx => tx.externalId).filter(Boolean)
    )

    const overlap = extended.parsed.transactions.filter(tx =>
      partialIds.has(tx.externalId)
    )

    expect(partial.parsed.transactions.length).toBe(10)
    expect(overlap.length).toBe(partial.parsed.transactions.length)
    expect(extended.parsed.transactions.length).toBeGreaterThan(partial.parsed.transactions.length)
  })

  it('detects duplicates when re-parsing an extended csv export', () => {
    const content = readFileSync(fixturePath, 'utf8')
    const lines = content.trim().split('\n')

    const partialContent = [lines[0], ...lines.slice(1, 11)].join('\n')
    const extendedContent = [lines[0], ...lines.slice(1, 16)].join('\n')

    const partial = parseNubankCsv({
      content: partialContent,
      fileName: 'partial.csv',
      closingDay: 1,
      dueDay: 8,
    })

    const extended = parseNubankCsv({
      content: extendedContent,
      fileName: 'extended.csv',
      closingDay: 1,
      dueDay: 8,
    })

    const existingExternalIds = new Set(
      partial.parsed.transactions
        .map(tx => tx.externalId)
        .filter((id): id is string => !!id)
    )

    const annotated = annotateTransactionDuplicates(
      extended.parsed.transactions,
      existingExternalIds,
      partial.parsed.transactions.map((tx, index) => ({
        id: `existing-${index}`,
        title: tx.title,
        amount: BigInt(Math.round(Number.parseFloat(tx.amount) * 100)),
        date: new Date(tx.date),
        externalId: tx.externalId ?? null,
      }))
    )

    expect(annotated.filter(tx => tx.isDuplicate).length).toBe(partial.parsed.transactions.length)
    expect(annotated.filter(tx => !tx.isDuplicate).length).toBe(
      extended.parsed.transactions.length - partial.parsed.transactions.length
    )
  })

  it('keeps external ids stable between csv and synthetic pdf rows', () => {
    const csvRow = {
      title: 'Lojas Renner Fl - Parcela 1/3',
      amount: '73.28',
      date: '2026-06-18T12:00:00.000Z',
      type: 'expense' as const,
      installmentNumber: 1,
      installmentsTotal: 3,
    }

    const [fromCsv] = assignStatementExternalIds([csvRow])
    const [fromPdf] = assignStatementExternalIds([csvRow])

    expect(fromCsv!.externalId).toBe(fromPdf!.externalId)
  })
})
