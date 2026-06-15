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

/** Original due date is in a month before the calendar view month. */
function isDueDateBeforeViewMonth(dueDate: Date | string, dateFrom: string): boolean {
  return toDateKey(dueDate).slice(0, 7) < dateFrom.slice(0, 7)
}

function rollDueDateIntoViewMonth(
  dueKey: string,
  dateFrom: string,
  dateTo: string
): string | null {
  if (dueKey > dateTo) return null

  let cursor = dayjs(dueKey)
  while (cursor.format('YYYY-MM-DD') < dateFrom) {
    cursor = cursor.add(1, 'month')
  }

  const rolledKey = cursor.format('YYYY-MM-DD')
  return isInRange(rolledKey, dateFrom, dateTo) ? rolledKey : null
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

function parseDateKey(dateKey: string): Date {
  return dayjs(dateKey).startOf('day').toDate()
}

export function isOverduePendingReminder(
  reminder: Reminder,
  referenceDate = new Date()
): boolean {
  if (!reminder.active) return false

  const currentDueKey = toDateKey(reminder.dueDate)
  if (isReminderOccurrenceCompleted(reminder, currentDueKey)) return false

  return computeDaysUntilDue(dayjs(reminder.dueDate).startOf('day').toDate(), referenceDate) < 0
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

export type ReminderCalendarSpan = {
  occurrenceDateKey: string
  displayKey: string
  isTransbordoRepositioned: boolean
}

export function getReminderCalendarSpans(
  reminder: Reminder,
  dateFrom: string,
  dateTo: string,
  referenceDate = new Date()
): ReminderCalendarSpan[] {
  const spans: ReminderCalendarSpan[] = []
  const currentDueKey = toDateKey(reminder.dueDate)
  const overduePending = isOverduePendingReminder(reminder, referenceDate)

  if (overduePending && currentDueKey < dateFrom) {
    const rolledKey = rollDueDateIntoViewMonth(currentDueKey, dateFrom, dateTo)
    if (rolledKey) {
      spans.push({
        occurrenceDateKey: currentDueKey,
        displayKey: rolledKey,
        isTransbordoRepositioned: true,
      })
    }
  }

  for (const dateKey of getReminderOccurrenceDatesInRange(reminder, dateFrom, dateTo)) {
    if (overduePending && dateKey > currentDueKey) continue
    if (spans.some(span => span.occurrenceDateKey === dateKey)) continue

    spans.push({
      occurrenceDateKey: dateKey,
      displayKey: dateKey,
      isTransbordoRepositioned: false,
    })
  }

  return spans
}

function buildReminderEventDescription(
  reminder: Reminder,
  isTransbordoRepositioned: boolean,
  occurrenceDateKey: string
): string | undefined {
  const parts: string[] = []

  if (isTransbordoRepositioned) {
    parts.push(`Transbordo · venc. ${dayjs(occurrenceDateKey).format('DD/MM')}`)
  }

  if (reminder.recipientName) parts.push(`Para: ${reminder.recipientName}`)
  if (reminder.amountCents != null) {
    parts.push(formatCurrency(centsToNumber(reminder.amountCents)))
  }
  if (reminder.notes) parts.push(reminder.notes)

  return parts.length > 0 ? parts.join(' · ') : 'Lembrete personalizado'
}

function buildReminderStatusLine(
  occurrenceDateKey: string,
  isCompleted: boolean,
  referenceDate: Date,
  isTransbordo: boolean
): string {
  if (isCompleted) return 'Concluído'

  const daysUntilDue = computeDaysUntilDue(parseDateKey(occurrenceDateKey), referenceDate)
  const overdueDays = daysUntilDue < 0 ? Math.abs(daysUntilDue) : undefined

  if (overdueDays) {
    return isTransbordo
      ? `${overdueDays}d · Vencido · Transbordo`
      : `${overdueDays}d · Lembrete`
  }

  if (daysUntilDue === 0) return 'Hoje · Lembrete'
  if (daysUntilDue === 1) return 'Amanhã · Lembrete'
  if (daysUntilDue > 1) return `${daysUntilDue}d · Lembrete`
  return 'Lembrete'
}

export function reminderToCalendarEvents(
  reminder: Reminder,
  dateFrom: string,
  dateTo: string,
  referenceDate = new Date()
): CalendarEvent[] {
  const spans = getReminderCalendarSpans(reminder, dateFrom, dateTo, referenceDate)

  return spans.map(span => {
    const { occurrenceDateKey, displayKey, isTransbordoRepositioned } = span
    const displayDate = dayjs(displayKey).toDate()
    const isCompleted = isReminderOccurrenceCompleted(reminder, occurrenceDateKey)
    const daysUntilDue = computeDaysUntilDue(parseDateKey(occurrenceDateKey), referenceDate)
    const overdueDays =
      !isCompleted && daysUntilDue < 0 ? Math.abs(daysUntilDue) : undefined
    const isTransbordo =
      !isCompleted &&
      isTransbordoRepositioned &&
      isDueDateBeforeViewMonth(occurrenceDateKey, dateFrom)

    return {
      id: `reminder:${reminder.id}:${occurrenceDateKey}`,
      title: reminder.title,
      start: displayDate,
      end: displayDate,
      allDay: true,
      color: 'violet',
      status: isCompleted ? 'paid' : undefined,
      overdueDays,
      description: buildReminderEventDescription(
        reminder,
        isTransbordoRepositioned,
        occurrenceDateKey
      ),
      eventType: 'reminder',
      amountLabel:
        reminder.amountCents != null
          ? formatCompactCurrency(centsToNumber(reminder.amountCents))
          : undefined,
      statusLine: buildReminderStatusLine(
        occurrenceDateKey,
        isCompleted,
        referenceDate,
        isTransbordo
      ),
      isTransbordo,
    }
  })
}

export function parseReminderEventId(id: string): { reminderId: string; dateKey: string } | null {
  if (!id.startsWith('reminder:')) return null
  const parts = id.slice('reminder:'.length).split(':')
  if (parts.length !== 2) return null
  return { reminderId: parts[0], dateKey: parts[1] }
}
