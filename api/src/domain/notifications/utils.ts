import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Check if "now" is within quiet hours window considering timezone.
 * If start > end the window crosses midnight.
 */
export function isWithinQuietHours(
  now: Date,
  start: string | null,
  end: string | null,
  tz: string
): boolean {
  if (!start || !end) return false

  const current = dayjs(now).tz(tz)
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startTime = current.set('hour', sh).set('minute', sm).set('second', 0)
  const endTime = current.set('hour', eh).set('minute', em).set('second', 0)

  if (startTime.isSame(endTime)) return true
  if (startTime.isBefore(endTime)) {
    return current.isAfter(startTime) && current.isBefore(endTime)
  }
  // crosses midnight
  return current.isAfter(startTime) || current.isBefore(endTime)
}

/**
 * Compute next eligible time from last notification respecting repetition.
 * Returns null when repeatEveryMinutes is null.
 */
export function calculateNextEligibleAt(
  lastNotifiedAt: Date | null,
  repeatEveryMinutes: number | null
): Date | null {
  if (repeatEveryMinutes == null) return null
  const base = lastNotifiedAt ? dayjs(lastNotifiedAt) : dayjs()
  return base.add(repeatEveryMinutes, 'minute').toDate()
}
