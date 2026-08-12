import dayjs from 'dayjs'

import { isoToCalendarDate } from '@/lib/date'

export function defaultScheduleDate(dueDate: string, scheduledAt?: string | null): string {
  const today = dayjs().format('YYYY-MM-DD')
  if (scheduledAt) {
    const scheduled = isoToCalendarDate(scheduledAt)
    return scheduled < today ? today : scheduled
  }
  const due = isoToCalendarDate(dueDate) || dueDate.slice(0, 10)
  return due < today ? today : due
}

export function isScheduleDateValid(value: string): boolean {
  return !dayjs(value).startOf('day').isBefore(dayjs().startOf('day'))
}
