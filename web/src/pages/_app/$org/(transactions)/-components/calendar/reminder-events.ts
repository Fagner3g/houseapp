import dayjs from 'dayjs'

import type { CalendarEvent } from '@/components/event-calendar'
import type { Reminder, ReminderRecurrenceType } from '@/features/alerts/api'
import { centsToNumber, formatCompactCurrency, formatCurrency } from '@/lib/currency'
import { computeDaysUntilDue } from '@/lib/date'

function toDateKey(value: Date | string): string {
  return dayjs(value).format('YYYY-MM-DD')
}

function isInRange(dateKey: string, from: string, to: string): boolean {
  return dateKey >= from && dateKey <= to
}

function addPeriod(date: Date, type: ReminderRecurrenceType, interval: number): Date {
  const next = new Date(date)
  switch (type) {
    case 'weekly':
      next.setDate(next.getDate() + 7 * interval)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + interval)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval)
      break
  }
  return next
}

function subPeriod(date: Date, type: ReminderRecurrenceType, interval: number): Date {
  const prev = new Date(date)
  switch (type) {
    case 'weekly':
      prev.setDate(prev.getDate() - 7 * interval)
      break
    case 'monthly':
      prev.setMonth(prev.getMonth() - interval)
      break
    case 'yearly':
      prev.setFullYear(prev.getFullYear() - interval)
      break
  }
  return prev
}

export function isReminderOccurrenceCompleted(reminder: Reminder, dateKey: string): boolean {
  const currentDueKey = toDateKey(reminder.dueDate)

  if (!reminder.isRecurring || !reminder.recurrenceType) {
    return reminder.completedAt != null && currentDueKey === dateKey
  }

  if (dateKey < currentDueKey) return true
  if (dateKey > currentDueKey) return false

  return reminder.completedAt != null || reminder.lastCompletedPeriodKey != null
}

export function isCurrentReminderOccurrence(reminder: Reminder, dateKey: string): boolean {
  return toDateKey(reminder.dueDate) === dateKey
}

export function getReminderOccurrenceDatesInRange(
  reminder: Reminder,
  dateFrom: string,
  dateTo: string
): string[] {
  const untilKey = reminder.recurrenceUntil ? toDateKey(reminder.recurrenceUntil) : null

  if (!reminder.isRecurring || !reminder.recurrenceType) {
    const dueKey = toDateKey(reminder.dueDate)
    return isInRange(dueKey, dateFrom, dateTo) ? [dueKey] : []
  }

  const type = reminder.recurrenceType
  const interval = reminder.recurrenceInterval || 1
  let current = dayjs(reminder.dueDate).startOf('day')

  while (toDateKey(current.toDate()) > dateFrom) {
    const prev = subPeriod(current.toDate(), type, interval)
    if (toDateKey(prev) >= toDateKey(current.toDate())) break
    current = dayjs(prev).startOf('day')
  }

  const dates: string[] = []
  for (let i = 0; i < 500; i++) {
    const key = toDateKey(current.toDate())
    if (untilKey && key > untilKey) break
    if (key > dateTo) break
    if (isInRange(key, dateFrom, dateTo)) {
      dates.push(key)
    }
    current = dayjs(addPeriod(current.toDate(), type, interval)).startOf('day')
  }

  return dates
}

export function reminderToCalendarEvents(
  reminder: Reminder,
  dateFrom: string,
  dateTo: string
): CalendarEvent[] {
  const dates = getReminderOccurrenceDatesInRange(reminder, dateFrom, dateTo)
  const referenceDate = new Date()

  return dates.map(dateKey => {
    const dueDate = dayjs(dateKey).toDate()
    const isCompleted = isReminderOccurrenceCompleted(reminder, dateKey)
    const daysUntilDue = computeDaysUntilDue(dueDate, referenceDate)
    const overdueDays =
      !isCompleted && daysUntilDue < 0 ? Math.abs(daysUntilDue) : undefined

    const descriptionParts = [
      reminder.recipientName ? `Para: ${reminder.recipientName}` : null,
      reminder.amountCents != null
        ? formatCurrency(centsToNumber(reminder.amountCents))
        : null,
      reminder.notes,
    ].filter(Boolean)

    const statusLine = isCompleted
      ? 'Concluído'
      : overdueDays
        ? `${overdueDays}d · Lembrete`
        : daysUntilDue === 0
          ? 'Hoje · Lembrete'
          : daysUntilDue === 1
            ? 'Amanhã · Lembrete'
            : daysUntilDue > 1
              ? `${daysUntilDue}d · Lembrete`
              : 'Lembrete'

    return {
      id: `reminder:${reminder.id}:${dateKey}`,
      title: reminder.title,
      start: dueDate,
      end: dueDate,
      allDay: true,
      color: 'violet',
      status: isCompleted ? 'paid' : undefined,
      overdueDays,
      description: descriptionParts.length ? descriptionParts.join(' · ') : 'Lembrete personalizado',
      eventType: 'reminder',
      amountLabel:
        reminder.amountCents != null
          ? formatCompactCurrency(centsToNumber(reminder.amountCents))
          : undefined,
      statusLine,
    }
  })
}

export function parseReminderEventId(id: string): { reminderId: string; dateKey: string } | null {
  if (!id.startsWith('reminder:')) return null
  const parts = id.slice('reminder:'.length).split(':')
  if (parts.length !== 2) return null
  return { reminderId: parts[0], dateKey: parts[1] }
}
