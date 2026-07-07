import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

export type BillingCycle = {
  /** YYYY-MM anchor for the invoice month */
  monthKey: string
  label: string
  periodStart: string
  periodEnd: string
  closingDate: string
  dueDate: string
}

function clampDayInMonth(year: number, monthIndex: number, day: number): number {
  return Math.min(day, dayjs().year(year).month(monthIndex).daysInMonth())
}

/** Derives billing window from account closing/due days and an anchor month (YYYY-MM). */
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
  const periodEnd = anchor.date(endDay).endOf('day')

  const prev = anchor.subtract(1, 'month')
  const prevYear = prev.year()
  const prevMonthIndex = prev.month()
  const startDay = clampDayInMonth(prevYear, prevMonthIndex, closingDay)
  const periodStart = prev.date(startDay).add(1, 'day').startOf('day')

  const dueAnchor = dueDay > closingDay ? anchor : anchor.add(1, 'month')
  const dueDateDay = clampDayInMonth(dueAnchor.year(), dueAnchor.month(), dueDay)
  const dueDate = dueAnchor.date(dueDateDay)

  return {
    monthKey,
    label: anchor.format('MMMM YYYY'),
    periodStart: periodStart.format('YYYY-MM-DD'),
    periodEnd: periodEnd.format('YYYY-MM-DD'),
    closingDate: periodEnd.format('YYYY-MM-DD'),
    dueDate: dueDate.format('YYYY-MM-DD'),
  }
}

export function currentBillingMonthKey(): string {
  return dayjs().format('YYYY-MM')
}

export function shiftBillingMonth(monthKey: string, direction: -1 | 1): string {
  return dayjs(`${monthKey}-01`).add(direction, 'month').format('YYYY-MM')
}

export function shiftBillingMonthByOffset(monthKey: string, offset: number): string {
  return dayjs(`${monthKey}-01`).add(offset, 'month').format('YYYY-MM')
}

function isWithinBillingRange(date: string, periodStart: string, periodEnd: string): boolean {
  const d = dayjs(date).startOf('day')
  const start = dayjs(periodStart).startOf('day')
  const end = dayjs(periodEnd).startOf('day')
  return !d.isBefore(start) && !d.isAfter(end)
}

/** Finds the invoice month that contains a purchase date. */
export function resolveBillingMonthKey(
  purchaseDate: string,
  closingDay: number,
  dueDay: number
): string {
  const anchorMonth = dayjs(purchaseDate).format('YYYY-MM')
  const candidates = [
    anchorMonth,
    shiftBillingMonth(anchorMonth, -1),
    shiftBillingMonth(anchorMonth, 1),
  ]

  for (const monthKey of candidates) {
    const cycle = getBillingCycle(closingDay, dueDay, monthKey)
    if (isWithinBillingRange(purchaseDate, cycle.periodStart, cycle.periodEnd)) {
      return monthKey
    }
  }

  return anchorMonth
}

function isWithinBillingPeriod(date: string, cycle: BillingCycle): boolean {
  const d = dayjs(date)
  const from = dayjs(cycle.periodStart).startOf('day')
  const to = dayjs(cycle.periodEnd).endOf('day')
  return !d.isBefore(from) && !d.isAfter(to)
}

/** Finds the invoice cycle that contains a credit card purchase date. */
export function resolveBillingCycleForPurchaseDate(
  closingDay: number,
  dueDay: number,
  purchaseDate: string
): BillingCycle {
  const anchor = dayjs(purchaseDate)
  const monthKeys = [
    anchor.format('YYYY-MM'),
    anchor.subtract(1, 'month').format('YYYY-MM'),
    anchor.add(1, 'month').format('YYYY-MM'),
    anchor.subtract(2, 'month').format('YYYY-MM'),
    anchor.add(2, 'month').format('YYYY-MM'),
  ]

  for (const monthKey of monthKeys) {
    const cycle = getBillingCycle(closingDay, dueDay, monthKey)
    if (isWithinBillingPeriod(purchaseDate, cycle)) return cycle
  }

  return getBillingCycle(closingDay, dueDay, anchor.format('YYYY-MM'))
}

export function formatInvoiceLabel(monthKey: string): string {
  const d = dayjs(`${monthKey}-01`)
  const month = d.format('MMMM')
  const capitalized = month.charAt(0).toUpperCase() + month.slice(1)
  return `Fatura de ${capitalized}/${d.format('YYYY')}`
}

/** Human-readable purchase window for a billing cycle (e.g. "02/02 – 01/03/2026"). */
export function formatBillingPeriodRange(cycle: BillingCycle): string {
  return formatDateRange(cycle.periodStart, cycle.periodEnd)
}

export function formatDateRange(start: string, end: string): string {
  return `${dayjs(start).format('DD/MM')} – ${dayjs(end).format('DD/MM/YYYY')}`
}

/**
 * OFX periodEnd is the closing date (ex.: 01/04), not the last purchase day (31/03).
 * When closing falls on the 1st, show purchases through the previous day.
 */
export function purchasePeriodDisplayEnd(periodEnd: string): string {
  const end = dayjs(periodEnd)
  if (end.date() === 1) {
    return end.subtract(1, 'day').format('YYYY-MM-DD')
  }
  return end.format('YYYY-MM-DD')
}

export function formatImportedPurchasePeriodRange(periodStart: string, periodEnd: string): string {
  return formatDateRange(periodStart, purchasePeriodDisplayEnd(periodEnd))
}

/** One-line context: purchase window and due date. */
export function formatBillingCycleContext(cycle: BillingCycle): string {
  const due = dayjs(cycle.dueDate).format('DD/MM/YYYY')
  const isOverdue = dayjs(cycle.dueDate).isBefore(dayjs(), 'day')
  return `Compras de ${formatBillingPeriodRange(cycle)} · ${isOverdue ? 'Venceu' : 'Vence'} ${due}`
}

type StatementLike = {
  periodStart?: string | null
  periodEnd?: string | null
  closingDate?: string | null
  dueDate?: string | null
}

function statementClosingDate(st: StatementLike): string | null {
  const raw = st.closingDate ?? st.periodEnd
  if (!raw) return null

  return dayjs(raw).format('YYYY-MM-DD')
}

function statementInvoiceMonthKey(st: StatementLike): string | null {
  const raw = st.closingDate ?? st.periodEnd ?? st.dueDate
  if (!raw) return null

  return dayjs(raw).format('YYYY-MM')
}

function statementDueMonthKey(st: StatementLike): string | null {
  if (!st.dueDate) return null

  return dayjs(st.dueDate).format('YYYY-MM')
}

/** Billing month where an imported statement should appear in the credit card UI. */
export function resolveStatementViewMonthKey(
  st: StatementLike,
  closingDay: number,
  dueDay: number
): string | null {
  const closing = statementClosingDate(st)
  if (closing) {
    return resolveBillingMonthKey(closing, closingDay, dueDay)
  }

  return statementDueMonthKey(st) ?? statementInvoiceMonthKey(st)
}

/**
 * Picks the imported statement for a billing cycle.
 * Prefers exact closing-date match; falls back to invoice month when OFX closing
 * day differs from the account (e.g. Nubank day 1 vs configured day 10).
 */
export function findStatementForCycle<T extends StatementLike>(
  statements: T[],
  cycle: BillingCycle,
  billingDays?: { closingDay: number; dueDay: number }
): T | null {
  const cycleClosing = dayjs(cycle.closingDate).format('YYYY-MM-DD')

  const exactMatch = statements.find(st => statementClosingDate(st) === cycleClosing)
  if (exactMatch) return exactMatch

  if (billingDays) {
    const byViewMonth = statements.find(
      st =>
        resolveStatementViewMonthKey(st, billingDays.closingDay, billingDays.dueDay) ===
        cycle.monthKey
    )
    if (byViewMonth) return byViewMonth
  }

  const dueMonthMatch = statements.find(st => statementDueMonthKey(st) === cycle.monthKey)
  if (dueMonthMatch) return dueMonthMatch

  return statements.find(st => statementInvoiceMonthKey(st) === cycle.monthKey) ?? null
}

export function findPreviousStatementForCycle<T extends StatementLike>(
  statements: T[],
  cycle: BillingCycle,
  closingDay: number,
  dueDay: number
): T | null {
  const previousMonthKey = shiftBillingMonth(cycle.monthKey, -1)
  const previousCycle = getBillingCycle(closingDay, dueDay, previousMonthKey)
  return findStatementForCycle(statements, previousCycle, { closingDay, dueDay })
}
