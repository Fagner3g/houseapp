import { useMemo } from 'react'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { EventCalendar } from '@/components/event-calendar'
import type { CalendarEvent } from '@/components/event-calendar'

interface Props {
  transactions: ListTransactions200TransactionsItem[]
}

export function CalendarTransactions({ transactions }: Props) {
  const events = useMemo<CalendarEvent[]>(
    () =>
      transactions.map(t => ({
        id: t.id,
        title: t.title,
        start: new Date(t.dueDate),
        end: new Date(t.dueDate),
        allDay: true,
        color: t.type === 'income' ? 'emerald' : 'rose',
      })),
    [transactions],
  )

  return <EventCalendar events={events} />
}

