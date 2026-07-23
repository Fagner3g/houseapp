import { describe, expect, it } from 'vitest'

import { shouldAskInstallmentDateScope } from './installment-date-scope'

describe('shouldAskInstallmentDateScope', () => {
  it('asks when non-CC installment due date changes', () => {
    expect(
      shouldAskInstallmentDateScope({
        isCreditCardAccount: false,
        installmentsTotal: 2,
        originalDateKey: '2026-07-28',
        nextDateKey: '2026-08-05',
      })
    ).toBe(true)
  })

  it('skips credit card accounts', () => {
    expect(
      shouldAskInstallmentDateScope({
        isCreditCardAccount: true,
        installmentsTotal: 3,
        originalDateKey: '2026-07-28',
        nextDateKey: '2026-08-05',
      })
    ).toBe(false)
  })

  it('skips single transactions and unchanged dates', () => {
    expect(
      shouldAskInstallmentDateScope({
        isCreditCardAccount: false,
        installmentsTotal: 1,
        originalDateKey: '2026-07-28',
        nextDateKey: '2026-08-05',
      })
    ).toBe(false)
    expect(
      shouldAskInstallmentDateScope({
        isCreditCardAccount: false,
        installmentsTotal: 2,
        originalDateKey: '2026-07-28',
        nextDateKey: '2026-07-28',
      })
    ).toBe(false)
  })
})
