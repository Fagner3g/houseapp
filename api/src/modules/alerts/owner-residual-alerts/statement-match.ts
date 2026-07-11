import dayjs from 'dayjs'

import {
  getBillingCycle,
  resolveBillingMonthKey,
  shiftBillingMonth,
  type BillingCycle,
} from '@/core/billing-cycle'

import type { ResidualStatement } from './metric-map'

type StatementMatchInput = Pick<
  ResidualStatement,
  'closingDate' | 'periodEnd' | 'dueDate'
>

function statementClosingDate(st: StatementMatchInput): string | null {
  const raw = st.closingDate ?? st.periodEnd
  if (!raw) return null
  return dayjs(raw).format('YYYY-MM-DD')
}

function statementDueMonthKey(st: StatementMatchInput): string | null {
  if (!st.dueDate) return null
  return dayjs(st.dueDate).format('YYYY-MM')
}

function statementInvoiceMonthKey(st: StatementMatchInput): string | null {
  const raw = st.closingDate ?? st.periodEnd ?? st.dueDate
  if (!raw) return null
  return dayjs(raw).format('YYYY-MM')
}

function resolveStatementViewMonthKey(
  st: StatementMatchInput,
  closingDay: number,
  dueDay: number
): string | null {
  const closing = statementClosingDate(st)
  if (closing) return resolveBillingMonthKey(closing, closingDay, dueDay)
  return statementDueMonthKey(st) ?? statementInvoiceMonthKey(st)
}

export function findStatementForCycle(
  statements: ResidualStatement[],
  cycle: BillingCycle,
  billingDays?: { closingDay: number; dueDay: number }
): ResidualStatement | null {
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

export function findPreviousStatementForCycle(
  statements: ResidualStatement[],
  cycle: BillingCycle,
  closingDay: number,
  dueDay: number
): ResidualStatement | null {
  const previousCycle = getBillingCycle(closingDay, dueDay, shiftBillingMonth(cycle.monthKey, -1))
  return findStatementForCycle(statements, previousCycle, { closingDay, dueDay })
}
