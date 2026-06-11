import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'

import {
  getTransactionEventSpan,
  transactionToCalendarEvent,
  transactionsToCalendarEvents,
} from './transaction-events'

const JUNE_FROM = '2026-06-01'
const JUNE_TO = '2026-06-30'
const REFERENCE = new Date('2026-06-11T12:00:00')

function mockTx(
  overrides: Partial<ListTransactions200TransactionsItem> &
    Pick<ListTransactions200TransactionsItem, 'id' | 'dueDate'>
): ListTransactions200TransactionsItem {
  return {
    id: overrides.id,
    serieId: overrides.serieId ?? 'serie-1',
    type: 'expense',
    contextualizedType: 'expense',
    title: overrides.title ?? 'Test',
    payTo: { name: 'Pay', email: 'pay@test.com' },
    ownerId: 'owner-1',
    payToId: 'payto-1',
    ownerName: 'Owner',
    amount: overrides.amount ?? '100',
    dueDate: overrides.dueDate,
    paidAt: overrides.paidAt ?? null,
    valuePaid: overrides.valuePaid ?? null,
    status: overrides.status ?? 'pending',
    overdueDays: overrides.overdueDays ?? 0,
    tags: [],
    installmentsTotal: overrides.installmentsTotal ?? null,
    installmentsPaid: overrides.installmentsPaid ?? null,
    installmentIndex: overrides.installmentIndex ?? null,
    description: overrides.description ?? null,
  }
}

describe('getOpenTransactionDisplayDate / transbordo roll', () => {
  it('rolls May 10 pending to June 10 when viewing June', () => {
    const tx = mockTx({ id: 'tx-1', dueDate: '2026-05-10', status: 'pending' })

    const span = getTransactionEventSpan(tx, JUNE_FROM, JUNE_TO, [tx])
    expect(span?.displayKey).toBe('2026-06-10')
    expect(span?.isTransbordoRepositioned).toBe(true)
    expect(span?.isPaidAtRepositioned).toBe(false)

    const event = transactionToCalendarEvent(tx, JUNE_FROM, JUNE_TO, REFERENCE, [tx])
    expect(event?.isTransbordo).toBe(true)
  })

  it('rolls May 10 partial to June 10 when viewing June', () => {
    const tx = mockTx({
      id: 'tx-1',
      dueDate: '2026-05-10',
      status: 'partial',
      valuePaid: 5000,
    })

    const span = getTransactionEventSpan(tx, JUNE_FROM, JUNE_TO, [tx])
    expect(span?.displayKey).toBe('2026-06-10')

    const event = transactionToCalendarEvent(tx, JUNE_FROM, JUNE_TO, REFERENCE, [tx])
    expect(event?.isTransbordo).toBe(true)
  })

  it('shows May 10 paid on June 11 at payment date without transbordo', () => {
    const tx = mockTx({
      id: 'tx-1',
      title: 'Empréstimo 4k',
      dueDate: '2026-05-10',
      status: 'paid',
      paidAt: '2026-06-11',
    })

    const span = getTransactionEventSpan(tx, JUNE_FROM, JUNE_TO, [tx])
    expect(span?.displayKey).toBe('2026-06-11')
    expect(span?.isPaidAtRepositioned).toBe(true)
    expect(span?.isTransbordoRepositioned).toBe(false)

    const event = transactionToCalendarEvent(tx, JUNE_FROM, JUNE_TO, REFERENCE, [tx])
    expect(event?.isTransbordo).toBe(false)
    expect(event?.statusLine).toBe('Pago · 32d venc.')

    const events = transactionsToCalendarEvents([tx], JUNE_FROM, JUNE_TO, REFERENCE)
    expect(events).toHaveLength(1)
    expect(events[0]?.start).toEqual(dayjs('2026-06-11').toDate())
    expect(events[0]?.statusLine).toBe('Pago · 32d venc.')
  })

  it('does not pull May 10 item to June 15 when series has June 15 installment', () => {
    const mayTx = mockTx({
      id: 'tx-may',
      dueDate: '2026-05-10',
      status: 'pending',
      installmentIndex: 1,
      installmentsTotal: 10,
    })
    const juneTx = mockTx({
      id: 'tx-june',
      dueDate: '2026-06-15',
      status: 'pending',
      installmentIndex: 2,
      installmentsTotal: 10,
    })
    const all = [mayTx, juneTx]

    const span = getTransactionEventSpan(mayTx, JUNE_FROM, JUNE_TO, all)
    expect(span?.displayKey).toBe('2026-06-10')
    expect(span?.displayKey).not.toBe('2026-06-15')
  })
})
