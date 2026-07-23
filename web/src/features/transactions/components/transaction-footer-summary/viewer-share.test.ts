import { describe, expect, it } from 'vitest'

import type { GetSplitDebtSummary200 } from '@/api/generated/model'
import { formatMoneyString } from '@/lib/currency'

import { collapsedHeader } from './collapsed-header'
import {
  countPendingForViewer,
  personDisplayName,
  resolveViewerInstallmentAmount,
  resolveViewerMyShare,
} from './viewer-share'

function summary(
  partial: Partial<GetSplitDebtSummary200> &
    Pick<GetSplitDebtSummary200, 'myShareTotal' | 'viewerIsCreditor'>
): GetSplitDebtSummary200 {
  return {
    purchaseTotal: '1350.00',
    purchaseTotalIsEstimate: false,
    installmentsTotal: null,
    currentInstallmentNumber: null,
    currentTransactionAmount: '1350.00',
    viewerOwedTotal: null,
    viewerRemainingTotal: null,
    persons: [],
    ...partial,
  }
}

describe('resolveViewerMyShare', () => {
  it('uses creditor residual when viewer is creditor', () => {
    const result = resolveViewerMyShare(
      summary({ myShareTotal: '0.00', viewerIsCreditor: true })
    )
    expect(result).toEqual({
      amount: '0.00',
      label: 'Meu valor',
      isDebtorView: false,
    })
  })

  it('uses viewer owed total when viewer is debtor', () => {
    const result = resolveViewerMyShare(
      summary({
        myShareTotal: '0.00',
        viewerIsCreditor: false,
        viewerOwedTotal: '1350.00',
        viewerRemainingTotal: '1350.00',
      })
    )
    expect(result).toEqual({
      amount: '1350.00',
      label: 'Meu valor',
      isDebtorView: true,
    })
  })
})

describe('countPendingForViewer', () => {
  it('counts only the viewer remaining on debtor view', () => {
    expect(
      countPendingForViewer(
        summary({
          myShareTotal: '0.00',
          viewerIsCreditor: false,
          viewerOwedTotal: '1350.00',
          viewerRemainingTotal: '1350.00',
          persons: [
            {
              key: 'user:a',
              name: 'Karoline',
              userId: 'a',
              contactName: null,
              contactPhone: null,
              totalOwed: '1350.00',
              totalPaid: '0.00',
              totalRemaining: '1350.00',
              status: 'pending',
              installments: [],
              isViewer: true,
            },
          ],
        })
      )
    ).toBe(1)
  })
})

describe('personDisplayName', () => {
  it('labels the viewer row as Você', () => {
    expect(personDisplayName({ name: 'Karoline', isViewer: true })).toBe('Você')
    expect(personDisplayName({ name: 'Karoline', isViewer: false })).toBe('Karoline')
  })
})

describe('collapsedHeader', () => {
  it('shows debtor share and A pagar chip', () => {
    const header = collapsedHeader(
      summary({
        myShareTotal: '0.00',
        viewerIsCreditor: false,
        viewerOwedTotal: '1350.00',
        viewerRemainingTotal: '1350.00',
      }),
      undefined,
      1350
    )
    expect(header.label).toBe('Meu valor')
    expect(header.primary).toBe(formatMoneyString('1350.00'))
    expect(header.chips).toEqual([{ text: 'A pagar', tone: 'warning' }])
  })

  it('falls back to purchase total when viewer share is zero', () => {
    const header = collapsedHeader(
      summary({
        myShareTotal: '0.00',
        viewerIsCreditor: true,
        persons: [
          {
            key: 'user:m',
            name: 'Marly',
            userId: 'm',
            contactName: null,
            contactPhone: null,
            totalOwed: '1350.00',
            totalPaid: '0.00',
            totalRemaining: '1350.00',
            status: 'pending',
            installments: [],
            isViewer: false,
          },
        ],
      }),
      undefined,
      1350
    )
    expect(header.label).toBe('Compra total')
    expect(header.primary).toBe(formatMoneyString('1350.00'))
    expect(header.chips).toEqual([{ text: '1 pendente', tone: 'warning' }])
  })
})

describe('resolveViewerInstallmentAmount', () => {
  it('shows debtor share of the current parcel, not the full purchase installment', () => {
    const result = resolveViewerInstallmentAmount(
      summary({
        purchaseTotal: '1675.10',
        myShareTotal: '837.55',
        viewerIsCreditor: false,
        viewerOwedTotal: '837.50',
        viewerRemainingTotal: '837.50',
        installmentsTotal: 10,
        currentInstallmentNumber: 1,
        currentTransactionAmount: '167.51',
        persons: [
          {
            key: 'user:a',
            name: 'Karoline',
            userId: 'a',
            contactName: null,
            contactPhone: null,
            totalOwed: '837.50',
            totalPaid: '0.00',
            totalRemaining: '837.50',
            status: 'pending',
            isViewer: true,
            installments: [
              {
                installmentNumber: 1,
                transactionId: 'tx-1',
                transactionAmount: '167.51',
                splitId: 'split-1',
                amount: '837.50',
                paidAmount: '0.00',
                status: 'pending',
              },
            ],
          },
        ],
      }),
      '167.51'
    )

    expect(result).toEqual({
      amount: '83.75',
      label: 'Minha parcela 1 de 10',
    })
  })

  it('keeps full parcel amount for creditor', () => {
    const result = resolveViewerInstallmentAmount(
      summary({
        myShareTotal: '837.55',
        viewerIsCreditor: true,
        installmentsTotal: 10,
        currentInstallmentNumber: 1,
        currentTransactionAmount: '167.51',
      }),
      '167.51'
    )

    expect(result).toEqual({
      amount: '167.51',
      label: 'Parcela 1 de 10',
    })
  })
})
