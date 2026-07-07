import { describe, expect, it } from 'vitest'

import { inferSplitsFromCardOwners } from './statement-split-inferrer.logic'

const baseItem = {
  title: 'Compra teste',
  amount: '10000',
  date: '2026-01-15T12:00:00.000Z',
  cardLastFour: '1234',
}

describe('inferSplitsFromCardOwners', () => {
  it('suggests full_other split when card belongs to another member', () => {
    const items = inferSplitsFromCardOwners(
      'user-owner',
      [baseItem],
      new Map([['1234', 'user-other']])
    )

    expect(items[0]?.splitHint).toEqual({
      mode: 'full_other',
      userId: 'user-other',
    })
  })

  it('does not suggest split when card belongs to current user', () => {
    const items = inferSplitsFromCardOwners(
      'user-owner',
      [baseItem],
      new Map([['1234', 'user-owner']])
    )

    expect(items[0]?.splitHint).toBeUndefined()
  })

  it('does not override an existing split hint', () => {
    const items = inferSplitsFromCardOwners(
      'user-owner',
      [
        {
          ...baseItem,
          splitHint: { mode: 'half' as const },
        },
      ],
      new Map([['1234', 'user-other']])
    )

    expect(items[0]?.splitHint).toEqual({ mode: 'half' })
  })
})
