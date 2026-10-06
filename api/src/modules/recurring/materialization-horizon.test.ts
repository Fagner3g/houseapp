import { describe, expect, it } from 'vitest'

import { materializationHorizon } from './materialization-horizon'

function day(iso: string): string {
  return materializationHorizon(new Date(iso)).toISOString().slice(0, 10)
}

describe('materializationHorizon', () => {
  it('fills the rest of the open month', () => {
    expect(day('2026-10-06T15:00:00.000Z')).toBe('2026-10-31')
    expect(day('2026-07-11T15:00:00.000Z')).toBe('2026-07-31')
  })

  it('reaches at least 7 days ahead when that crosses the month', () => {
    expect(day('2026-10-26T15:00:00.000Z')).toBe('2026-11-02')
    expect(day('2026-10-31T06:00:00.000Z')).toBe('2026-11-07')
  })
})
