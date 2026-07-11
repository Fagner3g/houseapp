import { describe, expect, it } from 'vitest'

import type { GetRecurringTransaction200RecurringTransaction } from '@/api/generated/model'

import {
  mapRecurringToFormValues,
  resolveRecurringDuration,
} from './recurring-contract-form'

function baseRecurring(
  overrides: Partial<GetRecurringTransaction200RecurringTransaction> = {}
): GetRecurringTransaction200RecurringTransaction {
  return {
    id: 'rec_1',
    organizationId: 'org_1',
    accountId: 'acc_1',
    title: 'DAS',
    amount: '0.00',
    type: 'expense',
    counterparty: null,
    categoryId: 'cat_1',
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-07-10T00:00:00.000Z',
    endDate: null,
    installmentsTotal: null,
    isActive: true,
    lastGeneratedDate: null,
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
    ...overrides,
  }
}

describe('resolveRecurringDuration', () => {
  it('maps unlimited contracts to infinite', () => {
    expect(resolveRecurringDuration(baseRecurring())).toBe('infinite')
  })

  it('maps installmentsTotal to times', () => {
    expect(resolveRecurringDuration(baseRecurring({ installmentsTotal: 12 }))).toBe('times')
  })

  it('ignores zero installmentsTotal', () => {
    expect(resolveRecurringDuration(baseRecurring({ installmentsTotal: 0 }))).toBe('infinite')
  })

  it('maps endDate to until', () => {
    expect(
      resolveRecurringDuration(baseRecurring({ endDate: '2027-01-01T00:00:00.000Z' }))
    ).toBe('until')
  })
})

describe('mapRecurringToFormValues', () => {
  it('hydrates edit form without inventing amount or counterparty', () => {
    expect(mapRecurringToFormValues(baseRecurring())).toMatchObject({
      title: 'DAS',
      counterparty: '',
      amount: null,
      accountId: 'acc_1',
      categoryId: 'cat_1',
      periodicity: 'monthly-1',
      recurringDuration: 'infinite',
    })
  })

  it('keeps positive amount and counterparty', () => {
    expect(
      mapRecurringToFormValues(
        baseRecurring({ amount: '150.55', counterparty: 'Receita Federal' })
      )
    ).toMatchObject({
      amount: 150.55,
      counterparty: 'Receita Federal',
    })
  })
})
