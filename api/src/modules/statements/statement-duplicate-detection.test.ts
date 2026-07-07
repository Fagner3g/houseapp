import { describe, expect, it } from 'vitest'

import {
  annotateTransactionDuplicates,
  findTransactionDuplicateMatch,
} from './statement-duplicate-detection'

describe('statement-duplicate-detection', () => {
  it('matches by external id first', () => {
    const match = findTransactionDuplicateMatch(
      {
        amount: '26.00',
        date: '2026-07-02T12:00:00.000Z',
        externalId: 'abc123',
      },
      new Set(['abc123']),
      [
        {
          id: 'tx-1',
          title: 'Marcio Parafusos',
          amount: 2600n,
          date: new Date('2026-07-02T12:00:00.000Z'),
          externalId: 'abc123',
        },
      ]
    )

    expect(match.isDuplicate).toBe(true)
    expect(match.duplicateTransactionId).toBe('tx-1')
  })

  it('falls back to amount and date when external id is missing', () => {
    const match = findTransactionDuplicateMatch(
      {
        amount: '50.90',
        date: '2026-07-01T12:00:00.000Z',
      },
      new Set(),
      [
        {
          id: 'tx-2',
          title: 'Burger King',
          amount: 5090n,
          date: new Date('2026-07-02T12:00:00.000Z'),
          externalId: null,
        },
      ]
    )

    expect(match.isDuplicate).toBe(true)
    expect(match.duplicateTransactionId).toBe('tx-2')
  })

  it('annotates parsed transactions with duplicate flags', () => {
    const annotated = annotateTransactionDuplicates(
      [
        {
          title: 'Burger King',
          amount: '50.90',
          date: '2026-07-01T12:00:00.000Z',
          externalId: 'hash-1',
        },
        {
          title: 'Marcio Parafusos',
          amount: '26.00',
          date: '2026-07-02T12:00:00.000Z',
          externalId: 'hash-2',
        },
      ],
      new Set(['hash-1']),
      []
    )

    expect(annotated[0]?.isDuplicate).toBe(true)
    expect(annotated[1]?.isDuplicate).toBe(false)
  })
})
