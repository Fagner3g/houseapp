export type InstallmentDateScope = 'current' | 'from_here' | 'all'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Calendar-day delta between two UTC-noon (or any) timestamps, ignoring time-of-day. */
export function utcCalendarDaysDelta(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  return Math.round((toUtc - fromUtc) / MS_PER_DAY)
}

/** Shift a date by calendar days, keeping UTC noon. */
export function shiftUtcCalendarDays(date: Date, days: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days, 12, 0, 0, 0)
  )
}

/**
 * Siblings (excluding the anchor) that should receive a due-date shift.
 * Paid/canceled rows are never cascaded.
 */
export function selectInstallmentDateCascadeTargets<
  T extends {
    id: string
    installmentNumber: number | null
    status: string
  },
>(
  siblings: T[],
  anchor: { id: string; installmentNumber: number | null },
  scope: InstallmentDateScope
): T[] {
  if (scope === 'current') return []

  const anchorNumber = anchor.installmentNumber ?? 0

  return siblings.filter(row => {
    if (row.id === anchor.id) return false
    if (row.status === 'paid' || row.status === 'canceled') return false
    const number = row.installmentNumber ?? 0
    if (scope === 'from_here') return number > anchorNumber
    return true
  })
}
