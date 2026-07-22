import dayjs from 'dayjs'

const TIMEZONE = 'America/Sao_Paulo'

/** Local calendar `YYYY-MM-DD` → ISO at UTC noon (stable day in BR and on UTC servers). */
export function calendarDateToIso(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)).toISOString()
}

/** ISO timestamp → `YYYY-MM-DD` using the UTC calendar day (matches stored due dates). */
export function isoToCalendarDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Local `Date` → `YYYY-MM-DD` using the browser calendar day. */
export function dateToCalendarDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** `YYYY-MM-DD` → local Date at local noon (safe for DayPicker selection/display). */
export function calendarDateToLocalDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

/** Parses an ISO date string to a local Date at noon on the UTC calendar day. */
export function parseDateFromIso(iso: string): Date {
  const key = isoToCalendarDate(iso)
  return key ? calendarDateToLocalDate(key) : dayjs(iso).toDate()
}

/** Converts a local Date to a timezone-safe ISO string (UTC noon of that calendar day). */
export function formatDateToIso(date: Date): string {
  return calendarDateToIso(dateToCalendarDate(date))
}

/** Formats an ISO timestamp as a calendar date label (pt-BR by default). */
export function formatIsoDateLabel(
  iso: string,
  locale = 'pt-BR',
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }
): string {
  const key = isoToCalendarDate(iso)
  if (!key) return ''
  return formatDateLabel(calendarDateToLocalDate(key), locale, options)
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

export function getEndOfDueMonth(date: Date): Date {
  return dayjs(date).endOf('month').endOf('day').toDate()
}

function parseCalendarDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function formatDueDateKey(dueDate: Date, timezone = TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dueDate)
}

/** Previous calendar day in the app timezone as UTC noon (for overdue `dateTo` filters). */
export function overdueDateToIso(referenceDate = new Date(), timezone = TIMEZONE): string {
  const todayKey = formatDueDateKey(referenceDate, timezone)
  const [year, month, day] = todayKey.split('-').map(Number)
  const previous = new Date(Date.UTC(year, month - 1, day - 1, 12, 0, 0, 0))
  return previous.toISOString()
}

export function computeDaysUntilDue(
  dueDate: Date,
  referenceDate = new Date(),
  timezone = TIMEZONE
): number {
  const todayKey = formatDueDateKey(referenceDate, timezone)
  const dueKey = formatDueDateKey(dueDate, timezone)
  const diffMs = parseCalendarDateKey(dueKey) - parseCalendarDateKey(todayKey)
  return Math.round(diffMs / 86400000)
}
