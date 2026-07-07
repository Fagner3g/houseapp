import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import utc from 'dayjs/plugin/utc'
import {
  billingDaysFromStatementDates as billingDaysFromStatementDatesKernel,
  getBillingCycle as getCoreBillingCycle,
  resolveBillingMonthKey as resolveBillingMonthKeyKernel,
  shiftBillingMonth,
  shiftBillingMonthByOffset,
  type BillingCycle as CoreBillingCycle,
} from '@houseapp/finance-core'

dayjs.extend(utc)
dayjs.locale('pt-br')

export {
  billingDaysFromStatementDatesKernel as billingDaysFromStatementDates,
  shiftBillingMonth,
  shiftBillingMonthByOffset,
}

type BillingDaysAccount = {
  closingDay?: number | null
  dueDay?: number | null
}

type BillingDaysStatement = {
  closingDate?: string | null
  dueDate?: string | null
}

export type ResolvedAccountBillingDays = {
  closingDay: number
  dueDay: number
  fromImport: boolean
}

/**
 * Prefers closing/due days from the latest imported statement (OFX/PDF).
 * Falls back to account settings when there is no import yet.
 */
export function resolveAccountBillingDays(
  account: BillingDaysAccount | null | undefined,
  statements: BillingDaysStatement[]
): ResolvedAccountBillingDays {
  const imported = statements
    .filter(
      (statement): statement is BillingDaysStatement & { closingDate: string; dueDate: string } =>
        Boolean(statement.closingDate && statement.dueDate)
    )
    .sort(
      (left, right) =>
        dayjs.utc(right.closingDate).valueOf() - dayjs.utc(left.closingDate).valueOf()
    )

  const latest = imported[0]
  if (latest) {
    return {
      ...billingDaysFromStatementDatesKernel(latest.closingDate, latest.dueDate),
      fromImport: true,
    }
  }

  return {
    closingDay: account?.closingDay ?? 1,
    dueDay: account?.dueDay ?? 10,
    fromImport: false,
  }
}

type StatementWithPeriod = BillingDaysStatement & {
  id?: string
  periodStart?: string | null
  periodEnd?: string | null
}

export type BillingCycle = CoreBillingCycle & {
  label: string
}

/**
 * Resolves the billing cycle for a month, preferring closing/due days from the
 * imported statement that belongs to that invoice (handles Nubank day 1 vs day 10).
 */
export function resolveBillingContextForMonth(
  account: BillingDaysAccount | null | undefined,
  statements: StatementWithPeriod[],
  monthKey: string
): BillingContextForMonth {
  const accountDays: ResolvedAccountBillingDays = {
    closingDay: account?.closingDay ?? 1,
    dueDay: account?.dueDay ?? 10,
    fromImport: false,
  }
  const provisionalCycle = getBillingCycle(accountDays.closingDay, accountDays.dueDay, monthKey)
  const matched = findStatementForCycle(statements, provisionalCycle, accountDays)

  if (matched?.closingDate && matched?.dueDate) {
    const statementDays = billingDaysFromStatementDatesKernel(
      matched.closingDate,
      matched.dueDate
    )

    return {
      cycle: getBillingCycle(statementDays.closingDay, statementDays.dueDay, monthKey),
      billingDays: { ...statementDays, fromImport: true },
      matchedStatement: matched,
    }
  }

  return {
    cycle: provisionalCycle,
    billingDays: accountDays,
    matchedStatement: null,
  }
}

export type BillingContextForMonth = {
  cycle: BillingCycle
  billingDays: ResolvedAccountBillingDays
  matchedStatement: StatementWithPeriod | null
}

function periodsOverlap(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string
): boolean {
  const start = dayjs(leftStart).startOf('day')
  const end = dayjs(leftEnd).endOf('day')
  const otherStart = dayjs(rightStart).startOf('day')
  const otherEnd = dayjs(rightEnd).endOf('day')

  return !start.isAfter(otherEnd) && !otherStart.isAfter(end)
}

/** Imported statements whose purchase window overlaps the current cycle but belong elsewhere. */
export function findOverlappingForeignStatements(
  statements: StatementWithPeriod[],
  cycle: BillingCycle,
  purchasesPeriod: { start: string; end: string },
  billingDays: { closingDay: number; dueDay: number },
  matchedStatementId?: string | null
): StatementWithPeriod[] {
  return statements.filter(statement => {
    if (matchedStatementId && statement.id === matchedStatementId) return false
    if (!statement.periodStart || !statement.periodEnd) return false

    const viewMonth = resolveStatementViewMonthKey(
      statement,
      billingDays.closingDay,
      billingDays.dueDay
    )
    if (viewMonth === cycle.monthKey) return false

    return periodsOverlap(
      purchasesPeriod.start,
      purchasesPeriod.end,
      statement.periodStart,
      statement.periodEnd
    )
  })
}

export function formatStatementBillingDays(
  closingDate: string,
  dueDate: string
): string {
  const { closingDay, dueDay } = billingDaysFromStatementDatesKernel(closingDate, dueDate)
  return `Fecha dia ${closingDay} · Vence dia ${dueDay}`
}

/** Derives billing window from account closing/due days and an anchor month (YYYY-MM). */
export function getBillingCycle(
  closingDay: number,
  dueDay: number,
  monthKey: string
): BillingCycle {
  const cycle = getCoreBillingCycle(closingDay, dueDay, monthKey)
  const [yearStr, monthStr] = monthKey.split('-')
  const anchor = dayjs().year(Number(yearStr)).month(Number(monthStr) - 1).startOf('month')
  const label = `${anchor.format('MMMM')} de ${anchor.format('YYYY')}`

  return { ...cycle, label }
}

export function currentBillingMonthKey(): string {
  return dayjs().format('YYYY-MM')
}

/** Finds the invoice month that contains a purchase date. */
export function resolveBillingMonthKey(
  purchaseDate: string,
  closingDay: number,
  dueDay: number
): string {
  return resolveBillingMonthKeyKernel(purchaseDate, closingDay, dueDay)
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
