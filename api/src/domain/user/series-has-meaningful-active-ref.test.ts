import { describe, expect, it } from 'vitest'

import { seriesHasMeaningfulActiveRef } from './series-has-meaningful-active-ref'

describe('seriesHasMeaningfulActiveRef', () => {
  it('returns false for inactive series', () => {
    expect(
      seriesHasMeaningfulActiveRef(
        { active: false, installmentsTotal: 1 },
        [{ status: 'pending' }]
      )
    ).toBe(false)
  })

  it('returns true when there are pending occurrences', () => {
    expect(
      seriesHasMeaningfulActiveRef(
        { active: true, installmentsTotal: 1 },
        [{ status: 'paid' }, { status: 'pending' }]
      )
    ).toBe(true)
  })

  it('returns true when there are partial occurrences', () => {
    expect(
      seriesHasMeaningfulActiveRef(
        { active: true, installmentsTotal: 5 },
        [{ status: 'partial' }]
      )
    ).toBe(true)
  })

  it('returns false for fully paid finite series still marked active', () => {
    expect(
      seriesHasMeaningfulActiveRef(
        { active: true, installmentsTotal: 5 },
        [
          { status: 'paid' },
          { status: 'paid' },
          { status: 'paid' },
          { status: 'paid' },
          { status: 'paid' },
        ]
      )
    ).toBe(false)
  })

  it('returns true for finite series with remaining installments', () => {
    expect(
      seriesHasMeaningfulActiveRef(
        { active: true, installmentsTotal: 5 },
        [{ status: 'paid' }, { status: 'paid' }, { status: 'paid' }]
      )
    ).toBe(true)
  })

  it('returns false for open-ended recurring series with all occurrences paid', () => {
    expect(
      seriesHasMeaningfulActiveRef(
        { active: true, installmentsTotal: null },
        [{ status: 'paid' }, { status: 'paid' }]
      )
    ).toBe(false)
  })

  it('returns false when all occurrences are canceled', () => {
    expect(
      seriesHasMeaningfulActiveRef(
        { active: true, installmentsTotal: 5 },
        [{ status: 'canceled' }, { status: 'canceled' }]
      )
    ).toBe(false)
  })
})
