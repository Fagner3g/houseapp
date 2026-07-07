import { describe, expect, it } from 'vitest'

import { FinanceValidationError } from './errors'
import { divideCentavos, formatCentavos, parseCentavos } from './money'

describe('parseCentavos', () => {
  it('parses decimal strings', () => {
    expect(parseCentavos('1234.56')).toBe(123456n)
    expect(parseCentavos('10')).toBe(1000n)
  })

  it('rejects invalid values', () => {
    expect(() => parseCentavos('abc')).toThrow(FinanceValidationError)
  })
})

describe('formatCentavos', () => {
  it('formats bigint centavos', () => {
    expect(formatCentavos(123456n)).toBe('1234.56')
    expect(formatCentavos(-500n)).toBe('-5.00')
  })
})

describe('divideCentavos', () => {
  it('splits evenly', () => {
    expect(divideCentavos(50000n, 10)).toEqual(Array(10).fill(5000n))
  })

  it('distributes remainder to first installments', () => {
    expect(divideCentavos(50001n, 10)).toEqual([5001n, ...Array(9).fill(5000n)])
  })

  it('rejects invalid part count', () => {
    expect(() => divideCentavos(100n, 0)).toThrow(FinanceValidationError)
  })
})
