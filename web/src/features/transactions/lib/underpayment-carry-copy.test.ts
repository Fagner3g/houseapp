import { describe, expect, it } from 'vitest'

import { underpaymentCarryHint } from './settlement-advance-copy'
import { underpaymentCarryToast } from './settlement-toasts'

describe('underpayment carry copy', () => {
  it('previews next parcel as current amount plus shortfall', () => {
    const hint = underpaymentCarryHint('income', 150, 200, 2, 200)
    expect(hint).toContain('parcela 2')
    expect(hint).toContain('250')
    expect(hint).not.toMatch(/passa a R\$\s*50/)
  })

  it('returns null when payment is not under remaining', () => {
    expect(underpaymentCarryHint('expense', 400, 400, 2, 400)).toBeNull()
    expect(underpaymentCarryHint('expense', 0, 400, 2, 400)).toBeNull()
  })

  it('builds success toast with next total', () => {
    expect(underpaymentCarryToast('income', 150, 50, 2, 250)).toContain('250')
    expect(underpaymentCarryToast('expense', 150, 50, 2, 250)).toContain('somados')
  })
})
