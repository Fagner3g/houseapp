import dayjs from 'dayjs'

/** Parses an ISO date string to a local Date at start of day. */
export function parseDateFromIso(iso: string): Date {
  return dayjs(iso).startOf('day').toDate()
}

/** Converts a local Date to a timezone-safe ISO string (noon UTC offset). */
export function formatDateToIso(date: Date): string {
  return dayjs(date).hour(12).minute(0).second(0).millisecond(0).toISOString()
}

export function formatNotifyTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function parseNotifyTime(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(':').map(Number)
  return { hour, minute }
}

export function formatDateLabel(
  date: Date,
  locale = 'pt-BR',
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }
): string {
  return date.toLocaleDateString(locale, options)
}
