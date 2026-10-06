/** Matches the default upcoming alert window (1, 3 and 7 days before due). */
export const RECURRING_LOOKAHEAD_DAYS = 7

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0)
  )
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return startOfUtcDay(next)
}

function endOfUtcMonth(date: Date): Date {
  const day = startOfUtcDay(date)
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0, 12, 0, 0, 0))
}

/**
 * How far ahead recurring occurrences are written.
 * Fills the open calendar month and stays at least {@link RECURRING_LOOKAHEAD_DAYS}
 * ahead so upcoming alerts have a row before the due date.
 */
export function materializationHorizon(now: Date): Date {
  const today = startOfUtcDay(now)
  const lookahead = addUtcDays(today, RECURRING_LOOKAHEAD_DAYS)
  const monthEnd = endOfUtcMonth(today)
  return lookahead.getTime() > monthEnd.getTime() ? lookahead : monthEnd
}
