import dayjs from 'dayjs'
import { useCallback, useMemo } from 'react'
import { useSearch } from '@tanstack/react-router'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { EventCalendar } from '@/components/event-calendar'
import type { CalendarEvent } from '@/components/event-calendar'
import { useDrawerStore } from '@/stores/drawers'
import { transactionsToCalendarEvents } from './transaction-events'

interface TransactionCalendarProps {
  transactions: ListTransactions200TransactionsItem[]
  dateFrom: string
  dateTo: string
  onDateRangeChange: (dateFrom: string, dateTo: string) => void
}

export function TransactionCalendar({
  transactions,
  dateFrom,
  dateTo,
  onDateRangeChange,
}: TransactionCalendarProps) {
  const openDrawer = useDrawerStore(s => s.openTransactionDrawer)
  const search = useSearch({ strict: false }) as {
    recurring?: 'all' | 'recurring' | 'single'
  }

  const filtered = useMemo(() => {
    if (!search.recurring || search.recurring === 'all') return transactions
    if (search.recurring === 'recurring') {
      return transactions.filter(t => t.recurringTransactionId != null)
    }
    return transactions.filter(t => t.recurringTransactionId == null)
  }, [transactions, search.recurring])

  const events = useMemo(
    () => transactionsToCalendarEvents(filtered, dateFrom, dateTo),
    [filtered, dateFrom, dateTo]
  )

  const initialDate = useMemo(
    () => dayjs(dateFrom).startOf('month').toDate(),
    [dateFrom]
  )

  const handleDateChange = useCallback(
    (date: Date) => {
      const from = dayjs(date).startOf('month').format('YYYY-MM-DD')
      const to = dayjs(date).endOf('month').format('YYYY-MM-DD')
      if (from === dateFrom && to === dateTo) return
      onDateRangeChange(from, to)
    },
    [dateFrom, dateTo, onDateRangeChange]
  )

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      const tx = filtered.find(t => t.id === event.id)
      if (!tx) return
      openDrawer(
        {
          categoryIds: tx.categoryIds,
          accountId: tx.accountId ?? undefined,
          cardId: tx.cardId ?? undefined,
        },
        tx.id
      )
    },
    [filtered, openDrawer]
  )

  return (
    <div className="mx-4 pb-24 lg:mx-6 md:pb-6">
      <EventCalendar
        events={events}
        onDateChange={handleDateChange}
        initialDate={initialDate}
        editable={false}
        onEventClick={handleEventClick}
      />
    </div>
  )
}
