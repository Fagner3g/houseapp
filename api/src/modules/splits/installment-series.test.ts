import { describe, expect, it } from 'vitest'

import {
  matchesInstallmentSeries,
  selectInstallmentSeriesSiblings,
} from './installment-series'

function row(
  partial: Partial<{
    id: string
    title: string
    installmentNumber: number
    installmentsTotal: number
    date: Date
    competenceDate: Date | null
    amount: bigint
  }> & { id: string; title: string; installmentNumber: number; date: Date }
) {
  return {
    organizationId: 'org-1',
    accountId: 'acc-1',
    cardId: null as string | null,
    installmentsTotal: 3,
    competenceDate: null as Date | null,
    amount: 27479n,
    ...partial,
  }
}

describe('selectInstallmentSeriesSiblings', () => {
  it('keeps a single coherent equal-amount series unchanged', () => {
    const anchor = row({
      id: 'a3',
      title: 'Supermercados Bh - Parcela 3/3',
      installmentNumber: 3,
      date: new Date('2026-05-31'),
      amount: 35259n,
    })
    const siblings = [
      row({
        id: 'a1',
        title: 'Supermercados Bh - Parcela 1/3',
        installmentNumber: 1,
        date: new Date('2026-04-25'),
        amount: 35259n,
      }),
      row({
        id: 'a2',
        title: 'Supermercados Bh - Parcela 2/3',
        installmentNumber: 2,
        date: new Date('2026-04-30'),
        amount: 35259n,
      }),
      anchor,
    ]

    expect(selectInstallmentSeriesSiblings(siblings, anchor).map(item => item.id)).toEqual([
      'a1',
      'a2',
      'a3',
    ])
  })

  it('disambiguates overlapping same-merchant purchases by date proximity', () => {
    const anchor = row({
      id: 'a3',
      title: 'Supermercados Bh - Parcela 3/3',
      installmentNumber: 3,
      date: new Date('2026-05-31'),
      amount: 35259n,
    })

    const candidates = [
      row({
        id: 'b1',
        title: 'Supermercados Bh - Parcela 1/3',
        installmentNumber: 1,
        date: new Date('2025-11-01'),
        amount: 35259n,
      }),
      row({
        id: 'b2',
        title: 'Supermercados Bh - Parcela 2/3',
        installmentNumber: 2,
        date: new Date('2025-12-01'),
        amount: 35259n,
      }),
      row({
        id: 'b3',
        title: 'Supermercados Bh - Parcela 3/3',
        installmentNumber: 3,
        date: new Date('2026-01-01'),
        amount: 35259n,
      }),
      row({
        id: 'a1',
        title: 'Supermercados Bh - Parcela 1/3',
        installmentNumber: 1,
        date: new Date('2026-04-25'),
        amount: 35259n,
      }),
      row({
        id: 'a2',
        title: 'Supermercados Bh - Parcela 2/3',
        installmentNumber: 2,
        date: new Date('2026-04-30'),
        amount: 35259n,
      }),
      anchor,
    ]

    const selected = selectInstallmentSeriesSiblings(candidates, anchor)

    expect(selected.map(item => item.id)).toEqual(['a1', 'a2', 'a3'])
    expect(selected.reduce((sum, item) => sum + (item.amount ?? 0n), 0n)).toBe(105777n)
  })

  it('does not mix two incomplete same-merchant 3x purchases with different amounts', () => {
    // Real bug: WhatsApp showed R$ 902,17 = 274,79 + 274,79 + 352,59
    const anchor = row({
      id: 'c1',
      title: 'Supermercados Bh - Parcela 1/3',
      installmentNumber: 1,
      date: new Date('2026-06-09'),
      amount: 27479n,
    })

    const candidates = [
      row({
        id: 'a1',
        title: 'Supermercados Bh - Parcela 1/3',
        installmentNumber: 1,
        date: new Date('2026-04-25'),
        amount: 35259n,
      }),
      row({
        id: 'a2',
        title: 'Supermercados Bh - Parcela 2/3',
        installmentNumber: 2,
        date: new Date('2026-04-30'),
        amount: 35259n,
      }),
      row({
        id: 'a3',
        title: 'Supermercados Bh - Parcela 3/3',
        installmentNumber: 3,
        date: new Date('2026-05-31'),
        amount: 35259n,
      }),
      anchor,
      row({
        id: 'c2',
        title: 'Supermercados Bh - Parcela 2/3',
        installmentNumber: 2,
        date: new Date('2026-07-09'),
        amount: 27479n,
      }),
    ]

    const selected = selectInstallmentSeriesSiblings(candidates, anchor)

    expect(selected.map(item => item.id)).toEqual(['c1', 'c2'])
    expect(selected.reduce((sum, item) => sum + (item.amount ?? 0n), 0n)).toBe(54958n)
  })

  it('rejects candidates that fail matchesInstallmentSeries', () => {
    const anchor = row({
      id: 'a1',
      title: 'Supermercados Bh - Parcela 1/3',
      installmentNumber: 1,
      date: new Date('2026-04-01'),
    })
    const other = row({
      id: 'x1',
      title: 'Outro mercado - Parcela 2/3',
      installmentNumber: 2,
      date: new Date('2026-05-01'),
    })

    expect(matchesInstallmentSeries(other, anchor)).toBe(false)
    expect(selectInstallmentSeriesSiblings([anchor, other], anchor).map(item => item.id)).toEqual([
      'a1',
    ])
  })
})
