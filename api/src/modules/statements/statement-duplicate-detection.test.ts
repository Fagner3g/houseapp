import { describe, expect, it } from 'vitest'

import {
  annotateTransactionDuplicates,
  findTransactionDuplicateMatch,
} from './statement-duplicate-detection'
import { decideImportedTransaction } from './statement-import-dedupe'

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

  it('matches legacy alternate external ids from OFX date drift', () => {
    const match = findTransactionDuplicateMatch(
      {
        title: 'Google Youtubepremium',
        amount: '26.90',
        date: '2026-07-12T12:00:00.000Z',
        externalId: 'stable-fitid-hash',
        alternateExternalIds: ['legacy-jul11-hash'],
      },
      new Set(['legacy-jul11-hash']),
      [
        {
          id: 'tx-yt',
          title: 'Google Youtubepremium',
          amount: 2690n,
          date: new Date('2026-07-11T12:00:00.000Z'),
          externalId: 'legacy-jul11-hash',
        },
      ]
    )

    expect(match.isDuplicate).toBe(true)
    expect(match.duplicateTransactionId).toBe('tx-yt')
  })

  it('falls back to amount, date and title when external id is missing', () => {
    const match = findTransactionDuplicateMatch(
      {
        title: 'Burger King',
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

  it('does not fuzzy-match different titles with the same amount', () => {
    const match = findTransactionDuplicateMatch(
      {
        title: 'Google Youtubepremium',
        amount: '26.90',
        date: '2026-07-12T12:00:00.000Z',
      },
      new Set(),
      [
        {
          id: 'tx-other',
          title: 'Spotify',
          amount: 2690n,
          date: new Date('2026-07-11T12:00:00.000Z'),
          externalId: null,
        },
      ]
    )

    expect(match.isDuplicate).toBe(false)
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

describe('decideImportedTransaction', () => {
  it('patches date and external id when legacy OFX hash matches after DTPOSTED drift', () => {
    const existing = {
      id: 'tx-yt',
      title: 'Google Youtubepremium',
      amount: 2690n,
      date: new Date('2026-07-11T12:00:00.000Z'),
      externalId: 'legacy-jul11-hash',
    }

    const decision = decideImportedTransaction(
      {
        title: 'Google Youtubepremium',
        amount: 2690n,
        date: new Date('2026-07-12T12:00:00.000Z'),
        externalId: 'stable-fitid-hash',
        alternateExternalIds: ['legacy-jul11-hash'],
      },
      new Map([['legacy-jul11-hash', existing]]),
      [existing],
      new Set()
    )

    expect(decision).toEqual({
      action: 'skip',
      existingId: 'tx-yt',
      patch: {
        date: new Date('2026-07-12T12:00:00.000Z'),
        externalId: 'stable-fitid-hash',
      },
    })
  })
})
