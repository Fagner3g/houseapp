import dayjs from 'dayjs'
import { computeInvoiceMetrics } from '@houseapp/finance-core'

import { getBillingCycle } from '@/core/billing-cycle'

import { computeDaysUntilDue } from '../alert-utils'
import {
  toStatementLike,
  toTransactionLike,
  type ResidualMetricTransaction,
  type ResidualStatement,
} from './metric-map'
import { findPreviousStatementForCycle, findStatementForCycle } from './statement-match'
import type { OwnerInvoiceAlert } from './types'

export type InvoiceGroupSeed = {
  accountId: string
  accountName: string
  monthKey: string
  closingDay: number
  dueDay: number
  transactionIds: string[]
  accountCreatedBy: string | null
}

export function resolveInvoiceRemainingCentavos(params: {
  seed: InvoiceGroupSeed
  accountTransactions: ResidualMetricTransaction[]
  accountStatements: ResidualStatement[]
}): bigint {
  const cycle = getBillingCycle(params.seed.closingDay, params.seed.dueDay, params.seed.monthKey)
  const statement = findStatementForCycle(params.accountStatements, cycle, {
    closingDay: params.seed.closingDay,
    dueDay: params.seed.dueDay,
  })
  const previousStatement = findPreviousStatementForCycle(
    params.accountStatements,
    cycle,
    params.seed.closingDay,
    params.seed.dueDay
  )

  const metrics = computeInvoiceMetrics(
    cycle,
    statement ? toStatementLike(statement) : null,
    params.accountTransactions.map(toTransactionLike),
    {
      previousStatement: previousStatement ? toStatementLike(previousStatement) : null,
      closingDay: params.seed.closingDay,
      dueDay: params.seed.dueDay,
    }
  )

  return metrics.remaining > 0n ? metrics.remaining : 0n
}

export function resolveOwnerInvoiceAlerts(params: {
  seeds: InvoiceGroupSeed[]
  transactionsByAccountId: Record<string, ResidualMetricTransaction[]>
  statementsByAccountId: Record<string, ResidualStatement[]>
  referenceDate?: Date
}): OwnerInvoiceAlert[] {
  const referenceDate = params.referenceDate ?? new Date()
  const alerts: OwnerInvoiceAlert[] = []

  for (const seed of params.seeds) {
    const remainingCentavos = resolveInvoiceRemainingCentavos({
      seed,
      accountTransactions: params.transactionsByAccountId[seed.accountId] ?? [],
      accountStatements: params.statementsByAccountId[seed.accountId] ?? [],
    })
    if (remainingCentavos <= 0n) continue

    const cycle = getBillingCycle(seed.closingDay, seed.dueDay, seed.monthKey)
    const dueDate = dayjs(cycle.dueDate).hour(12).minute(0).second(0).millisecond(0).toDate()

    alerts.push({
      accountId: seed.accountId,
      accountName: seed.accountName,
      monthKey: seed.monthKey,
      dueDate,
      remainingCentavos,
      daysUntilDue: computeDaysUntilDue(dueDate, referenceDate),
      transactionIds: seed.transactionIds,
      accountCreatedBy: seed.accountCreatedBy,
    })
  }

  return alerts
}
