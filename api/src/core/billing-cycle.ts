import dayjs from 'dayjs'

export type BillingCycle = {
  monthKey: string
  periodStart: string
  periodEnd: string
  closingDate: string
  dueDate: string
}

function clampDayInMonth(year: number, monthIndex: number, day: number): number {
  return Math.min(day, dayjs().year(year).month(monthIndex).daysInMonth())
}

export function getBillingCycle(
  closingDay: number,
  dueDay: number,
  monthKey: string
): BillingCycle {
  const [yearStr, monthStr] = monthKey.split('-')
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1
  const anchor = dayjs().year(year).month(monthIndex).startOf('month')

  const endDay = clampDayInMonth(year, monthIndex, closingDay)
  const periodEnd = anchor.date(endDay).format('YYYY-MM-DD')

  const prev = anchor.subtract(1, 'month')
  const prevYear = prev.year()
  const prevMonthIndex = prev.month()
  const startDay = clampDayInMonth(prevYear, prevMonthIndex, closingDay)
  const periodStart = prev.date(startDay).add(1, 'day').format('YYYY-MM-DD')

  const dueAnchor = dueDay > closingDay ? anchor : anchor.add(1, 'month')
  const dueDateDay = clampDayInMonth(dueAnchor.year(), dueAnchor.month(), dueDay)
  const dueDate = dueAnchor.date(dueDateDay).format('YYYY-MM-DD')

  return {
    monthKey,
    periodStart,
    periodEnd,
    closingDate: periodEnd,
    dueDate,
  }
}

export function shiftBillingMonth(monthKey: string, direction: -1 | 1): string {
  return dayjs(`${monthKey}-01`).add(direction, 'month').format('YYYY-MM')
}

export function shiftBillingMonthByOffset(monthKey: string, offset: number): string {
  return dayjs(`${monthKey}-01`).add(offset, 'month').format('YYYY-MM')
}

export function isWithinBillingRange(
  date: string | Date,
  periodStart: string,
  periodEnd: string
): boolean {
  const d = dayjs(date).startOf('day')
  const start = dayjs(periodStart).startOf('day')
  const end = dayjs(periodEnd).startOf('day')
  return !d.isBefore(start) && !d.isAfter(end)
}

/** Finds the invoice month that contains a purchase date. */
export function resolveBillingMonthKey(
  purchaseDate: Date,
  closingDay: number,
  dueDay: number
): string {
  const purchase = dayjs(purchaseDate).startOf('day')
  const anchorMonth = purchase.format('YYYY-MM')
  const candidates = [
    anchorMonth,
    shiftBillingMonth(anchorMonth, -1),
    shiftBillingMonth(anchorMonth, 1),
  ]

  for (const monthKey of candidates) {
    const cycle = getBillingCycle(closingDay, dueDay, monthKey)
    if (isWithinBillingRange(purchase.toDate(), cycle.periodStart, cycle.periodEnd)) {
      return monthKey
    }
  }

  return anchorMonth
}

export function addMonthsPreserveDay(date: Date, months: number): Date {
  const base = dayjs(date)
  const target = base.add(months, 'month')
  const clampedDay = Math.min(base.date(), target.daysInMonth())
  return target.date(clampedDay).hour(12).minute(0).second(0).millisecond(0).toDate()
}

/** Derives account closing/due days from authoritative statement dates (e.g. PDF import). */
export function billingDaysFromStatementDates(
  closingDate: Date,
  dueDate: Date
): { closingDay: number; dueDay: number } {
  return {
    closingDay: closingDate.getUTCDate(),
    dueDay: dueDate.getUTCDate(),
  }
}
