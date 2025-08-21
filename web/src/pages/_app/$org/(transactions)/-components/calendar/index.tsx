import { useMemo, useCallback, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
dayjs.locale('pt-br')
import { useNavigate } from '@tanstack/react-router'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { EventCalendar } from '@/components/event-calendar'
import type { CalendarEvent } from '@/components/event-calendar'
import { TransactionDrawer } from './transaction-drawer'

interface Props {
  transactions: ListTransactions200TransactionsItem[]
  dateFrom: string
  dateTo: string
}

export function CalendarTransactions({ transactions, dateFrom, dateTo }: Props) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<ListTransactions200TransactionsItem | null>(null)
  const events = useMemo<CalendarEvent[]>(
    () =>
      transactions.map(t => ({
        id: t.id,
        title: t.title,
        start: new Date(t.dueDate),
        end: new Date(t.dueDate),
        allDay: true,
        color: t.type === 'income' ? 'emerald' : 'rose',
        status: t.status,
        overdueDays: t.overdueDays,
      })),
    [transactions],
  )

  const initialDate = useMemo(() => dayjs(dateFrom).toDate(), [dateFrom])

  const handleDateChange = useCallback(
    (date: Date) => {
      const from = dayjs(date).startOf('month').format('YYYY-MM-DD')
      const to = dayjs(date).endOf('month').format('YYYY-MM-DD')

      if (from === dateFrom && to === dateTo) return

      navigate({
        to: '.',
        search: prev => ({ ...prev, dateFrom: from, dateTo: to, page: 1 }),
        replace: true,
      })
    },
    [dateFrom, dateTo, navigate],
  )

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      const tx = transactions.find(t => t.id === event.id) ?? null
      setSelected(tx)
    },
    [transactions],
  )

  return (
    <>
      <EventCalendar
        events={events}
        onDateChange={handleDateChange}
        initialDate={initialDate}
        editable={false}
        onEventClick={handleEventClick}
      />
      <TransactionDrawer
        transaction={selected}
        open={!!selected}
        onOpenChange={open => {
          if (!open) setSelected(null)
        }}
      />
    </>
  )
}

