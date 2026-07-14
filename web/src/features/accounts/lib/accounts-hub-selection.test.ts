import { describe, expect, it } from 'vitest'

import {
  defaultMonthForKind,
  kindForAccount,
  resolveHubSelectionPatch,
} from './accounts-hub-selection'

const card = {
  id: 'card-1',
  type: 'credit_card',
} as const

const checking = {
  id: 'acc-1',
  type: 'checking',
} as const

describe('accounts-hub-selection', () => {
  it('maps account types to hub kinds', () => {
    expect(kindForAccount(card as never)).toBe('cards')
    expect(kindForAccount(checking as never)).toBe('accounts')
  })

  it('returns default calendar vs billing month helpers', () => {
    expect(defaultMonthForKind('cards')).toMatch(/^\d{4}-\d{2}$/)
    expect(defaultMonthForKind('accounts')).toMatch(/^\d{4}-\d{2}$/)
  })

  it('switches kind when selected account belongs to the other tab', () => {
    const patch = resolveHubSelectionPatch({
      accounts: [card, checking] as never,
      accountId: 'acc-1',
      kind: 'cards',
      activeList: [card] as never,
    })

    expect(patch).toMatchObject({
      kind: 'accounts',
      accountId: 'acc-1',
    })
  })

  it('selects first item when current selection is invalid', () => {
    const patch = resolveHubSelectionPatch({
      accounts: [checking] as never,
      accountId: 'missing',
      kind: 'accounts',
      activeList: [checking] as never,
    })

    expect(patch).toMatchObject({
      kind: 'accounts',
      accountId: 'acc-1',
    })
  })
})
