import { describe, expect, it } from 'vitest'

import type { SplitDebtSummary } from './split-debt-summary.logic'
import { withViewerDebtPerspective } from './viewer-debt-summary'

const baseSummary = (): SplitDebtSummary => ({
  purchaseTotal: '1350.00',
  purchaseTotalIsEstimate: false,
  myShareTotal: '0.00',
  installmentsTotal: null,
  currentInstallmentNumber: null,
  currentTransactionAmount: '1350.00',
  persons: [
    {
      key: 'user:user-karoline',
      name: 'Karoline Mayra',
      userId: 'user-karoline',
      contactName: null,
      contactPhone: null,
      totalOwed: '1350.00',
      totalPaid: '0.00',
      totalRemaining: '1350.00',
      status: 'pending',
      installments: [],
    },
  ],
})

describe('withViewerDebtPerspective', () => {
  it('marks creditor residual perspective and does not expose viewer share totals', () => {
    const result = withViewerDebtPerspective(baseSummary(), {
      viewerUserId: 'user-diego',
      viewerIsCreditor: true,
    })

    expect(result.viewerIsCreditor).toBe(true)
    expect(result.viewerOwedTotal).toBeNull()
    expect(result.viewerRemainingTotal).toBeNull()
    expect(result.myShareTotal).toBe('0.00')
    expect(result.persons[0]?.isViewer).toBe(false)
  })

  it('exposes debtor share as viewer totals and flags isViewer', () => {
    const result = withViewerDebtPerspective(baseSummary(), {
      viewerUserId: 'user-karoline',
      viewerIsCreditor: false,
    })

    expect(result.viewerIsCreditor).toBe(false)
    expect(result.viewerOwedTotal).toBe('1350.00')
    expect(result.viewerRemainingTotal).toBe('1350.00')
    expect(result.persons[0]?.isViewer).toBe(true)
    expect(result.persons[0]?.name).toBe('Karoline Mayra')
  })

  it('keeps viewer totals null when debtor has no matching person row', () => {
    const result = withViewerDebtPerspective(baseSummary(), {
      viewerUserId: 'user-other',
      viewerIsCreditor: false,
    })

    expect(result.viewerOwedTotal).toBeNull()
    expect(result.viewerRemainingTotal).toBeNull()
    expect(result.persons.every(person => !person.isViewer)).toBe(true)
  })
})
