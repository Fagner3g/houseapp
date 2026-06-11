import { useMemo, useCallback, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
dayjs.locale('pt-br')
import { useNavigate } from '@tanstack/react-router'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { EventCalendar } from '@/components/event-calendar'
import type { CalendarEvent } from '@/components/event-calendar'
import { useReminders, type Reminder } from '@/features/alerts/api'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { parseReminderEventId, reminderToCalendarEvents } from './reminder-events'
import { transactionsToCalendarEvents } from './transaction-events'
import { ReminderDialog } from './reminder-dialog'
import { TransactionCalendarDialog } from './transaction-dialog'

interface Props {
  transactions: ListTransactions200TransactionsItem[]
  dateFrom: string
  dateTo: string
  onEditTransaction?: (transaction: ListTransactions200TransactionsItem) => void
}

export function CalendarTransactions({
  transactions,
  dateFrom,
  dateTo,
  onEditTransaction,
}: Props) {
  const navigate = useNavigate()
  const { slug } = useActiveOrganization()
  const { data: remindersData } = useReminders(slug, { includeCompleted: true })
  const [selected, setSelected] = useState<ListTransactions200TransactionsItem | null>(null)
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null)
  const [selectedReminderDate, setSelectedReminderDate] = useState<string | null>(null)

  const remindersById = useMemo(() => {
    const map = new Map<string, Reminder>()
    for (const reminder of remindersData?.reminders ?? []) {
      map.set(reminder.id, reminder)
    }
    return map
  }, [remindersData?.reminders])

  const events = useMemo<CalendarEvent[]>(() => {
    const transactionEvents = transactionsToCalendarEvents(transactions, dateFrom, dateTo)

    const reminderEvents = (remindersData?.reminders ?? []).flatMap(reminder =>
      reminderToCalendarEvents(reminder, dateFrom, dateTo)
    )

    return [...transactionEvents, ...reminderEvents]
  }, [transactions, remindersData?.reminders, dateFrom, dateTo])

  const monthRange = useMemo(() => {
    const anchor = dayjs(dateFrom).isValid() ? dayjs(dateFrom) : dayjs()
    return {
      from: anchor.startOf('month').format('YYYY-MM-DD'),
      to: anchor.endOf('month').format('YYYY-MM-DD'),
      initialDate: anchor.startOf('month').toDate(),
    }
  }, [dateFrom])

  const handleDateChange = useCallback(
    (date: Date) => {
      const from = dayjs(date).startOf('month').format('YYYY-MM-DD')
      const to = dayjs(date).endOf('month').format('YYYY-MM-DD')

      if (from === monthRange.from && to === monthRange.to) return

      navigate({
        to: '.',
        search: prev => ({ ...prev, dateFrom: from, dateTo: to, page: 1 }),
        replace: true,
      })
    },
    [monthRange.from, monthRange.to, navigate]
  )

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      const reminderRef = parseReminderEventId(event.id)
      if (reminderRef) {
        const reminder = remindersById.get(reminderRef.reminderId) ?? null
        setSelected(null)
        setSelectedReminder(reminder)
        setSelectedReminderDate(reminderRef.dateKey)
        return
      }

      const tx = transactions.find(t => t.id === event.id) ?? null
      setSelectedReminder(null)
      setSelectedReminderDate(null)
      setSelected(tx)
    },
    [transactions, remindersById]
  )

  return (
    <>
      <EventCalendar
        events={events}
        onDateChange={handleDateChange}
        initialDate={monthRange.initialDate}
        editable={false}
        onEventClick={handleEventClick}
      />
      <TransactionCalendarDialog
        transaction={selected}
        open={!!selected}
        onOpenChange={open => {
          if (!open) setSelected(null)
        }}
        onEditTransaction={onEditTransaction}
      />
      <ReminderDialog
        reminder={selectedReminder}
        occurrenceDate={selectedReminderDate}
        open={!!selectedReminder}
        onOpenChange={open => {
          if (!open) {
            setSelectedReminder(null)
            setSelectedReminderDate(null)
          }
        }}
      />
    </>
  )
}
