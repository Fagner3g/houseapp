import { describe, expect, it } from 'vitest'

import { resolveOccurrenceDescription } from './resolve-occurrence-description'

describe('resolveOccurrenceDescription', () => {
  it('uses explicit description when provided', () => {
    expect(
      resolveOccurrenceDescription('nova', [{ description: 'antiga' }])
    ).toBe('nova')
  })

  it('inherits from latest existing occurrence with description', () => {
    expect(
      resolveOccurrenceDescription(undefined, [
        { description: 'primeira' },
        { description: null },
        { description: '  ultima  ' },
      ])
    ).toBe('ultima')
  })

  it('returns undefined when no description is available', () => {
    expect(
      resolveOccurrenceDescription(undefined, [
        { description: null },
        { description: '   ' },
      ])
    ).toBeUndefined()
  })
})
