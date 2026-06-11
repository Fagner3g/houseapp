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
import {
  formatCompactCurrency,
  formatPartialPaymentDescription,
  formatPartialPaymentStatusCompact,
} from '@/lib/currency'
import { computeDaysUntilDue } from '@/lib/date'
import {
  getInstallmentProgress,
  getTransactionDisplayStatus,
  getTransactionStatusLabel,
} from '@/lib/transaction-status'
import { parseReminderEventId, reminderToCalendarEvents } from './reminder-events'
import { ReminderDialog } from './reminder-dialog'
import { TransactionCalendarDialog } from './transaction-dialog'

interface Props {
  transactions: ListTransactions200TransactionsItem[]
  dateFrom: string
  dateTo: string
  onEditTransaction?: (transaction: ListTransactions200TransactionsItem) => void
}

function buildTransactionEventDescription(
  transaction: ListTransactions200TransactionsItem
): string | undefined {
  const parts: string[] = []

  if (transaction.status === 'partial' && transaction.valuePaid != null) {
    parts.push(
      formatPartialPaymentDescription(Number(transaction.amount), transaction.valuePaid)
    )
  }

  if (transaction.installmentsTotal != null && transaction.installmentIndex != null) {
    parts.push(`Parcela ${transaction.installmentIndex} de ${transaction.installmentsTotal}`)
  }

  return parts.length > 0 ? parts.join(' · ') : undefined
}

function buildPartialPaymentSummary(
  transaction: ListTransactions200TransactionsItem
): string | undefined {
  if (transaction.status !== 'partial' || transaction.valuePaid == null) return undefined

  return formatPartialPaymentStatusCompact(Number(transaction.amount), transaction.valuePaid)
}

function titleHasInstallmentHint(title: string, total: number): boolean {
  return new RegExp(`\\b${total}x\\s*$`, 'i').test(title.trim())
}

function buildTransactionStatusLine(
  transaction: ListTransactions200TransactionsItem
): string | undefined {
  const displayStatus = getTransactionDisplayStatus(transaction)

  if (displayStatus === 'paid') return 'Pago'
  if (displayStatus === 'canceled') return 'Cancelado'

  if (displayStatus === 'overdue') {
    const days = transaction.overdueDays
    return days > 0 ? `${days}d · Vencido` : 'Vencido'
  }

  if (displayStatus === 'partial') {
    const parts: string[] = []
    const days = transaction.overdueDays
    if (days > 0) parts.push(`${days}d`)
    parts.push('Parcial')
    const partialSummary = buildPartialPaymentSummary(transaction)
    if (partialSummary) parts.push(partialSummary)
    return parts.join(' · ')
  }

  const daysUntilDue = computeDaysUntilDue(new Date(transaction.dueDate))
  if (daysUntilDue === 0) return 'Vence hoje'
  if (daysUntilDue === 1) return 'Amanhã'
  if (daysUntilDue > 1) return `${daysUntilDue}d`

  return getTransactionStatusLabel(transaction)
}

function buildTransactionInstallmentLabel(
  transaction: ListTransactions200TransactionsItem
): string | undefined {
  const progress = getInstallmentProgress(transaction)
  if (!progress?.show) return undefined
  if (titleHasInstallmentHint(transaction.title, progress.total)) return undefined
  return `${progress.total}x`
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
    const transactionEvents = transactions.map(t => ({
      id: t.id,
      title: t.title,
      start: new Date(t.dueDate),
      end: new Date(t.dueDate),
      allDay: true,
      color: t.type === 'income' ? ('emerald' as const) : ('rose' as const),
      status: t.status,
      overdueDays: t.overdueDays,
      description: buildTransactionEventDescription(t),
      eventType: 'transaction' as const,
      amountLabel: formatCompactCurrency(Number(t.amount)),
      installmentLabel: buildTransactionInstallmentLabel(t),
      statusLine: buildTransactionStatusLine(t),
      valuePaid: t.valuePaid,
    }))

    const reminderEvents = (remindersData?.reminders ?? []).flatMap(reminder =>
      reminderToCalendarEvents(reminder, dateFrom, dateTo)
    )

    return [...transactionEvents, ...reminderEvents]
  }, [transactions, remindersData?.reminders, dateFrom, dateTo])

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
    [dateFrom, dateTo, navigate]
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
        initialDate={initialDate}
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
