import { describe, expect, it } from 'vitest'

import { buildSplitCreateBody } from '@/features/accounts/components/import-review-types'

import { buildInstallmentPreview } from './installment-preview'

const splitDraftHalf = {
  splitMode: 'half' as const,
  splitPersonMode: 'member' as const,
  splitUserId: 'user-karoline',
  splitContactName: '',
  splitContactPhone: '',
  splitAmountReais: 450,
  notifyEnabled: true,
}

describe('split installment flow (50/50 on parceled purchase)', () => {
  it('preview shows R$ 225 split per R$ 450 installment', () => {
    const preview = buildInstallmentPreview({
      totalAmount: 900,
      installmentsTotal: 2,
      startDate: '2026-07-06',
      periodicity: 'monthly-1',
      account: { type: 'credit_card', closingDay: 1, dueDay: 18 },
      isCreditCardExpense: true,
      split: { splitMode: 'half', splitAmountReais: 450 },
    })

    expect(preview).toHaveLength(2)
    expect(preview?.map(item => item.amount)).toEqual([450, 450])
    expect(preview?.map(item => item.splitAmount)).toEqual([225, 225])
    expect(preview?.map(item => item.myShareAmount)).toEqual([225, 225])
  })

  it('applyDraftSplits creates R$ 225 split on each installment (mirrors create flow)', () => {
    const preview = buildInstallmentPreview({
      totalAmount: 900,
      installmentsTotal: 2,
      startDate: '2026-07-06',
      periodicity: 'monthly-1',
      account: { type: 'checking' },
      split: { splitMode: 'half', splitAmountReais: 450 },
    })!

    const splits = preview.map(item =>
      buildSplitCreateBody(
        String(item.amount * 100),
        splitDraftHalf,
        {
          installmentsTotal: item.installmentsTotal,
          installmentNumber: item.installmentNumber,
        }
      )
    )

    expect(splits).toHaveLength(2)
    expect(splits[0]?.amount).toBe('225.00')
    expect(splits[1]?.amount).toBe('225.00')
    expect(splits[0]?.userId).toBe('user-karoline')

    const totalOwed =
      Number(splits[0]?.amount ?? 0) + Number(splits[1]?.amount ?? 0)
    expect(totalOwed).toBe(450)
  })

  it('custom R$ 450 total is divided across installments', () => {
    const customDraft = { ...splitDraftHalf, splitMode: 'custom' as const }

    const split1 = buildSplitCreateBody('45000', customDraft, {
      installmentsTotal: 2,
      installmentNumber: 1,
    })
    const split2 = buildSplitCreateBody('45000', customDraft, {
      installmentsTotal: 2,
      installmentNumber: 2,
    })

    expect(split1?.amount).toBe('225.00')
    expect(split2?.amount).toBe('225.00')
  })
})
