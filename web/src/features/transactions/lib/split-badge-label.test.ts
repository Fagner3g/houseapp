import { describe, expect, it } from 'vitest'

import {
  formatDelegatedSplitBadge,
  formatPartialSplitBadge,
  isHalfSplit,
  resolveSplitBadgePerspective,
  resolveSplitBadgeSettlement,
} from './split-badge-label'

describe('isHalfSplit', () => {
  it('detects exact 50/50', () => {
    expect(isHalfSplit('100.00', '200.00')).toBe(true)
    expect(isHalfSplit('193.95', '387.90')).toBe(true)
  })

  it('rejects non-half amounts', () => {
    expect(isHalfSplit('50.00', '200.00')).toBe(false)
    expect(isHalfSplit('100.01', '200.00')).toBe(false)
  })
})

describe('resolveSplitBadgeSettlement', () => {
  it('maps remaining to settlement', () => {
    expect(resolveSplitBadgeSettlement(undefined)).toBeUndefined()
    expect(resolveSplitBadgeSettlement(10)).toBe('pending')
    expect(resolveSplitBadgeSettlement(0)).toBe('received')
  })
})

describe('resolveSplitBadgePerspective', () => {
  it('marks current user as debtor when ids match', () => {
    expect(resolveSplitBadgePerspective('u1', 'u1')).toBe('debtor')
    expect(resolveSplitBadgePerspective('u1', 'u2')).toBe('creditor')
    expect(resolveSplitBadgePerspective(null, 'u1')).toBe('creditor')
  })
})

describe('formatPartialSplitBadge', () => {
  it('labels half splits as 50/50', () => {
    expect(
      formatPartialSplitBadge({
        splitWithName: 'Ana',
        splitAmount: '100.00',
        transactionAmount: '200.00',
      })
    ).toBe('50/50 · Ana')
  })

  it('uses creditor language by default', () => {
    const info = {
      splitWithName: 'Ana',
      splitAmount: '50.00',
      transactionAmount: '200.00',
    }
    expect(formatPartialSplitBadge(info, 'pending')).toBe('A receber · Ana')
    expect(formatPartialSplitBadge(info, 'received')).toBe('Recebido · Ana')
  })

  it('uses debtor language for the split debtor', () => {
    const info = {
      splitWithName: 'Ana',
      splitAmount: '100.00',
      transactionAmount: '200.00',
      creditorName: 'Fagner',
    }
    expect(formatPartialSplitBadge(info, 'pending', 'debtor')).toBe('A pagar · Fagner')
    expect(formatPartialSplitBadge(info, 'received', 'debtor')).toBe('Pago · Fagner')
  })
})

describe('formatDelegatedSplitBadge', () => {
  it('labels without settlement as Delegada', () => {
    expect(formatDelegatedSplitBadge('Carla')).toBe('Delegada · Carla')
  })

  it('uses settlement labels for creditor', () => {
    expect(formatDelegatedSplitBadge('Carla', 'pending')).toBe('A receber · Carla')
    expect(formatDelegatedSplitBadge('Carla', 'received')).toBe('Recebido · Carla')
  })

  it('uses settlement labels for debtor', () => {
    expect(formatDelegatedSplitBadge('Carla', 'pending', 'debtor', 'Fagner')).toBe(
      'A pagar · Fagner'
    )
    expect(formatDelegatedSplitBadge('Carla', 'received', 'debtor', 'Fagner')).toBe(
      'Pago · Fagner'
    )
  })
})
