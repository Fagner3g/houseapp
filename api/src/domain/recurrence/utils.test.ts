import { describe, expect, it } from 'vitest'

import { addPeriod, humanizeInterval, occurrencesBetween } from './utils'

describe('recurrence utils', () => {
  it('addPeriod increments date according to recurrence type', () => {
    const base = new Date('2024-01-01')
    expect(addPeriod(base, 'weekly', 1)).toEqual(new Date('2024-01-08'))
    expect(addPeriod(base, 'monthly', 1)).toEqual(new Date('2024-02-01'))
    expect(addPeriod(base, 'yearly', 1)).toEqual(new Date('2025-01-01'))
    expect(addPeriod(base, 'custom', 10)).toEqual(new Date('2024-01-11'))
  })

  it('occurrencesBetween counts occurrences between dates', () => {
    const start = new Date('2024-01-01')
    const end = new Date('2024-03-01')
    expect(occurrencesBetween(start, end, 'monthly', 1)).toBe(2)
    expect(occurrencesBetween(start, new Date('2024-01-15'), 'weekly', 1)).toBe(3)
    expect(occurrencesBetween(end, start, 'monthly', 1)).toBe(0)
  })

  it('humanizeInterval formats intervals', () => {
    expect(humanizeInterval('weekly', 2)).toBe('2 semanas')
    expect(humanizeInterval('yearly', 1)).toBe('1 ano')
    expect(humanizeInterval('custom', 3)).toBe('3 dias')
    expect(humanizeInterval('monthly', 1)).toBe('1 mês')
    expect(humanizeInterval('monthly', 2)).toBe('2 meses')
    expect(humanizeInterval('monthly', 12)).toBe('1 ano')
  })
})
