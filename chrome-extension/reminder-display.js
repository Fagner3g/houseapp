/**
 * Mirrors web calendar transbordo logic (reminder-events.ts).
 * Loaded before popup.js and via importScripts in background.js.
 *
 * Parity test cases (manual QA alongside web vitest):
 * - 15/mai overdue IPTU, viewing jun → displayKey 2026-06-15, isTransbordo true
 * - 15/mai completed → not shown in June
 * - monthly recurring overdue in May → June 15 transbordo only (no June recurrence)
 */
;(function (global) {
  function toDateKey(value) {
    const d = value instanceof Date ? value : new Date(value)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function isInDateKeyRange(dateKey, from, to) {
    return dateKey >= from && dateKey <= to
  }

  function isDueDateBeforeViewMonth(dueDate, dateFrom) {
    return toDateKey(dueDate).slice(0, 7) < dateFrom.slice(0, 7)
  }

  function getMonthDateKeyRange(year, month) {
    const m = String(month).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    return {
      from: `${year}-${m}-01`,
      to: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
    }
  }

  function addMonthsToDateKey(dateKey, months) {
    const [y, mo, d] = dateKey.split('-').map(Number)
    const cursor = new Date(y, mo - 1 + months, d)
    return toDateKey(cursor)
  }

  function rollDueDateIntoViewMonth(dueKey, dateFrom, dateTo) {
    if (dueKey > dateTo) return null

    let cursor = dueKey
    while (cursor < dateFrom) {
      cursor = addMonthsToDateKey(cursor, 1)
    }

    return isInDateKeyRange(cursor, dateFrom, dateTo) ? cursor : null
  }

  function addPeriod(date, type, interval) {
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

  function subPeriod(date, type, interval) {
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

  function computeDaysUntilDue(dueDate, referenceDate) {
    const ref = referenceDate || new Date()
    const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
    const due = dueDate instanceof Date ? dueDate : new Date(dueDate)
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
    return Math.round((dueDay - today) / (1000 * 60 * 60 * 24))
  }

  /** Mirrors api getReminderPeriodKey (monthly/yearly; weekly uses ISO week). */
  function getReminderPeriodKey(dueDate, recurrenceType) {
    const d = dueDate instanceof Date ? dueDate : new Date(dueDate)
    if (recurrenceType === 'yearly') {
      return String(d.getFullYear())
    }
    if (recurrenceType === 'weekly') {
      const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      const dayNum = utc.getUTCDay() || 7
      utc.setUTCDate(utc.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
      const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
      return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
    }
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }

  function isPeriodKeyCompleted(item, dateKey) {
    if (!item.lastCompletedPeriodKey) return false
    const type = item.isRecurring && item.recurrenceType ? item.recurrenceType : null
    const [y, mo, d] = dateKey.split('-').map(Number)
    const occurrenceDate = new Date(y, mo - 1, d)
    return item.lastCompletedPeriodKey === getReminderPeriodKey(occurrenceDate, type)
  }

  function isReminderOccurrenceCompleted(item, dateKey) {
    const currentDueKey = toDateKey(item.dueDate)

    if (!item.isRecurring || !item.recurrenceType) {
      return item.completedAt != null && currentDueKey === dateKey
    }

    if (dateKey < currentDueKey) return true
    if (dateKey > currentDueKey) return false

    return item.completedAt != null || isPeriodKeyCompleted(item, dateKey)
  }

  function isOverduePendingReminder(reminder, referenceDate) {
    if (!reminder.active) return false

    const currentDueKey = toDateKey(reminder.dueDate)
    if (isReminderOccurrenceCompleted(reminder, currentDueKey)) return false

    return computeDaysUntilDue(reminder.dueDate, referenceDate) < 0
  }

  function getReminderOccurrenceDatesInRange(reminder, dateFrom, dateTo) {
    const untilKey = reminder.recurrenceUntil ? toDateKey(reminder.recurrenceUntil) : null

    if (!reminder.isRecurring || !reminder.recurrenceType) {
      const dueKey = toDateKey(reminder.dueDate)
      return isInDateKeyRange(dueKey, dateFrom, dateTo) ? [dueKey] : []
    }

    const type = reminder.recurrenceType
    const interval = reminder.recurrenceInterval || 1
    let current = new Date(reminder.dueDate)
    current.setHours(0, 0, 0, 0)

    while (toDateKey(current) > dateFrom) {
      const prev = subPeriod(current, type, interval)
      if (toDateKey(prev) >= toDateKey(current)) break
      current = prev
      current.setHours(0, 0, 0, 0)
    }

    const dates = []
    for (let i = 0; i < 500; i++) {
      const key = toDateKey(current)
      if (untilKey && key > untilKey) break
      if (key > dateTo) break
      if (isInDateKeyRange(key, dateFrom, dateTo)) {
        dates.push(key)
      }
      const next = addPeriod(current, type, interval)
      if (toDateKey(next) <= toDateKey(current)) break
      current = next
      current.setHours(0, 0, 0, 0)
    }

    return dates
  }

  function getReminderCalendarSpans(reminder, dateFrom, dateTo, referenceDate) {
    const spans = []
    const ref = referenceDate || new Date()
    const currentDueKey = toDateKey(reminder.dueDate)
    const overduePending = isOverduePendingReminder(reminder, ref)

    if (overduePending && currentDueKey < dateFrom) {
      if (!isReminderOccurrenceCompleted(reminder, currentDueKey)) {
        const rolledKey = rollDueDateIntoViewMonth(currentDueKey, dateFrom, dateTo)
        if (rolledKey) {
          spans.push({
            occurrenceDateKey: currentDueKey,
            displayKey: rolledKey,
            isTransbordoRepositioned: true,
          })
        }
      }
    }

    for (const dateKey of getReminderOccurrenceDatesInRange(reminder, dateFrom, dateTo)) {
      if (isReminderOccurrenceCompleted(reminder, dateKey)) continue
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

  function filterRemindersForMonth(reminders, year, month, referenceDate) {
    const { from, to } = getMonthDateKeyRange(year, month)
    const result = []

    for (const reminder of reminders || []) {
      for (const span of getReminderCalendarSpans(reminder, from, to, referenceDate)) {
        result.push({
          reminder,
          occurrenceDateKey: span.occurrenceDateKey,
          displayDateKey: span.displayKey,
          isTransbordo: span.isTransbordoRepositioned,
        })
      }
    }

    return result
  }

  function filterPendingRemindersForMonth(reminders, year, month, referenceDate) {
    return filterRemindersForMonth(reminders, year, month, referenceDate).filter(
      ({ reminder, occurrenceDateKey }) =>
        !isReminderOccurrenceCompleted(reminder, occurrenceDateKey)
    )
  }

  function countOverdueReminders(reminders, year, month, referenceDate) {
    const today = referenceDate || new Date()
    today.setHours(0, 0, 0, 0)

    return filterPendingRemindersForMonth(reminders, year, month, referenceDate).filter(
      ({ occurrenceDateKey }) => {
        const due = new Date(occurrenceDateKey)
        due.setHours(0, 0, 0, 0)
        return due < today
      }
    ).length
  }

  global.ReminderDisplay = {
    toDateKey,
    getMonthDateKeyRange,
    getReminderPeriodKey,
    isReminderOccurrenceCompleted,
    isOverduePendingReminder,
    getReminderOccurrenceDatesInRange,
    getReminderCalendarSpans,
    filterRemindersForMonth,
    filterPendingRemindersForMonth,
    countOverdueReminders,
    isDueDateBeforeViewMonth,
  }
})(typeof window !== 'undefined' ? window : self)
