import { describe, expect, it } from 'vitest'

import { findTransactionDuplicateMatch } from './statement-duplicate-detection'
import { decideImportedTransaction } from './statement-import-dedupe'

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

  it('does not skip a refund that only shares a FITID-only hash with a purchase', () => {
    const purchase = {
      id: 'tx-purchase',
      title: 'Pousada Estalagem da S - Parcela 1/3',
      amount: 27134n,
      date: new Date('2026-07-14T12:00:00.000Z'),
      externalId: 'fitid-only-shared-hash',
    }

    const decision = decideImportedTransaction(
      {
        title: 'Estorno de compra (Pousada Estalagem da S)',
        amount: 27134n,
        date: new Date('2026-07-18T12:00:00.000Z'),
        externalId: 'refund-disambiguated-hash',
        alternateExternalIds: ['fitid-only-shared-hash'],
      },
      new Map([['fitid-only-shared-hash', purchase]]),
      [purchase],
      new Set()
    )

    expect(decision).toEqual({ action: 'insert' })
  })
})

describe('FITID-only alternate matching', () => {
  it('does not treat FITID-only alternate as duplicate when title differs', () => {
    const fitIdOnly = 'fitid-only-shared-hash'

    const match = findTransactionDuplicateMatch(
      {
        title: 'Estorno de compra (Pousada Estalagem da S)',
        amount: '271.34',
        date: '2026-07-18T12:00:00.000Z',
        externalId: 'refund-disambiguated-hash',
        alternateExternalIds: [fitIdOnly],
      },
      new Set([fitIdOnly]),
      [
        {
          id: 'tx-purchase',
          title: 'Pousada Estalagem da S - Parcela 1/3',
          amount: 27134n,
          date: new Date('2026-07-14T12:00:00.000Z'),
          externalId: fitIdOnly,
        },
      ]
    )

    expect(match.isDuplicate).toBe(false)
  })

  it('migrates FITID-only rows when title and amount still match', () => {
    const fitIdOnly = 'fitid-only-shared-hash'

    const match = findTransactionDuplicateMatch(
      {
        title: 'Pousada Estalagem da S - Parcela 1/3',
        amount: '271.34',
        date: '2026-07-14T12:00:00.000Z',
        externalId: 'purchase-disambiguated-hash',
        alternateExternalIds: [fitIdOnly],
      },
      new Set([fitIdOnly]),
      [
        {
          id: 'tx-purchase',
          title: 'Pousada Estalagem da S - Parcela 1/3',
          amount: 27134n,
          date: new Date('2026-07-14T12:00:00.000Z'),
          externalId: fitIdOnly,
        },
      ]
    )

    expect(match.isDuplicate).toBe(true)
    expect(match.duplicateTransactionId).toBe('tx-purchase')
  })
})
