import { useMemo } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
dayjs.locale('pt-br')
import { useNavigate } from '@tanstack/react-router'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { EventCalendar } from '@/components/event-calendar'
import type { CalendarEvent } from '@/components/event-calendar'

interface Props {
  transactions: ListTransactions200TransactionsItem[]
  dateFrom: string
  dateTo: string
}

export function CalendarTransactions({ transactions, dateFrom, dateTo }: Props) {
  const navigate = useNavigate()
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

  const initialDate = useMemo(() => dayjs(dateFrom).toDate(), [dateFrom])

  const handleDateChange = (date: Date) => {
    const from = dayjs(date).startOf('month').format('YYYY-MM-DD')
    const to = dayjs(date).endOf('month').format('YYYY-MM-DD')

    if (from === dateFrom && to === dateTo) return

    navigate({
      to: '.',
      search: prev => ({ ...prev, dateFrom: from, dateTo: to, page: 1 }),
      replace: true,
    })
  }

  return (
    <EventCalendar
      events={events}
      onDateChange={handleDateChange}
      initialDate={initialDate}
      editable={false}
    />
  )
}

