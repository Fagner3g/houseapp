import { describe, expect, it } from 'vitest'

describe('investment recurrence planning', () => {
  it('keeps linear step examples coherent for amount mode', () => {
    const initial = 10
    const step = 10
    const monthValues = Array.from({ length: 4 }, (_, index) => initial + step * index)

    expect(monthValues).toEqual([10, 20, 30, 40])
  })

  it('keeps linear step examples coherent for quantity mode', () => {
    const initial = 1
    const step = 1
    const monthValues = Array.from({ length: 4 }, (_, index) => initial + step * index)

    expect(monthValues).toEqual([1, 2, 3, 4])
  })
})
