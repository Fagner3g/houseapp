import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

/** App calendar timezone for due dates, alerts, and overdue boundaries. */
export const APP_TIMEZONE = 'America/Sao_Paulo'

/** Start of the current calendar day in the app timezone (as a UTC `Date`). */
export function startOfTodayInAppTimezone(referenceDate = new Date()): Date {
  return dayjs(referenceDate).tz(APP_TIMEZONE).startOf('day').toDate()
}
