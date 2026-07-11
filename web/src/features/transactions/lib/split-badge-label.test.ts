import { describe, expect, it } from 'vitest'

import {
  formatDelegatedSplitBadge,
  formatPartialSplitBadge,
  isHalfSplit,
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

  it('labels custom amounts as Valor', () => {
    const label = formatPartialSplitBadge({
      splitWithName: 'Bruno',
      splitAmount: '75.50',
      transactionAmount: '200.00',
    })
    expect(label.startsWith('Valor ·')).toBe(true)
    expect(label).toContain('75,50')
    expect(label).toContain('Bruno')
  })

  it('uses settlement labels when provided', () => {
    const info = {
      splitWithName: 'Ana',
      splitAmount: '100.00',
      transactionAmount: '200.00',
    }
    expect(formatPartialSplitBadge(info, 'pending')).toBe('A receber · Ana')
    expect(formatPartialSplitBadge(info, 'received')).toBe('Recebido · Ana')
  })
})

describe('formatDelegatedSplitBadge', () => {
  it('labels full delegation', () => {
    expect(formatDelegatedSplitBadge('Carla')).toBe('Delegada · Carla')
  })

  it('labels settlement states', () => {
    expect(formatDelegatedSplitBadge('Carla', 'pending')).toBe('A receber · Carla')
    expect(formatDelegatedSplitBadge('Carla', 'received')).toBe('Recebido · Carla')
  })
})
