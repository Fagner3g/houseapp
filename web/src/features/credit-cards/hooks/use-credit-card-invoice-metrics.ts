import { useMemo } from 'react'
import dayjs from 'dayjs'

import { useListStatements } from '@/api/generated/api'
import type { BillingCycle } from '@/lib/billing-cycle'
import {
  findPreviousStatementForCycle,
  findStatementForCycle,
  findNextStatementForCycle,
} from '@/lib/billing-cycle'
import {
  computeInvoiceMetrics,
  resolvePaymentPeriod,
  resolvePurchasesPeriod,
  buildCreditCardReportScope,
} from '@/lib/credit-card-invoice-metrics'
import { findOverlappingForeignStatements } from '@/lib/billing-cycle'
import { useActiveOrganization } from '@/hooks/use-active-organization'

import { useInvoiceCycleTransactions } from './use-invoice-cycle-transactions'

export function useCreditCardInvoiceMetrics(
  accountId: string,
  cycle: BillingCycle,
  closingDay: number,
  dueDay: number,
  enabled = true
) {
  const { slug } = useActiveOrganization()

  const { data: statementsData, isPending: statementsPending } = useListStatements(
    slug,
    accountId,
    { query: { enabled: enabled && !!slug && !!accountId } }
  )

  const matchedStatement = useMemo(
    () =>
      findStatementForCycle(statementsData?.statements ?? [], cycle, {
        closingDay,
        dueDay,
      }),
    [statementsData?.statements, cycle, closingDay, dueDay]
  )

  const previousStatement = useMemo(
    () =>
      findPreviousStatementForCycle(
        statementsData?.statements ?? [],
        cycle,
        closingDay,
        dueDay
      ),
    [statementsData?.statements, cycle, closingDay, dueDay]
  )

  const nextStatement = useMemo(
    () =>
      findNextStatementForCycle(
        statementsData?.statements ?? [],
        cycle,
        closingDay,
        dueDay
      ),
    [statementsData?.statements, cycle, closingDay, dueDay]
  )

  const paymentContext = useMemo(
    () => ({ previousStatement, nextStatement, closingDay, dueDay }),
    [previousStatement, nextStatement, closingDay, dueDay]
  )

  const purchasesPeriod = useMemo(
    () => resolvePurchasesPeriod(cycle, matchedStatement),
    [cycle, matchedStatement]
  )

  const paymentPeriod = useMemo(
    () => resolvePaymentPeriod(cycle, matchedStatement, paymentContext),
    [cycle, matchedStatement, paymentContext]
  )

  const dateFromIso = dayjs(purchasesPeriod.start).startOf('day').toISOString()
  const dateToIso = dayjs(paymentPeriod.end).endOf('day').toISOString()

  const { transactions: cycleTransactions, isPending: transactionsPending } =
    useInvoiceCycleTransactions(
      slug,
      { accountId, dateFrom: dateFromIso, dateTo: dateToIso, perPage: 100 },
      enabled && !!slug && !!accountId
    )

  const metrics = useMemo(
    () =>
      computeInvoiceMetrics(
        cycle,
        matchedStatement,
        cycleTransactions,
        paymentContext
      ),
    [cycleTransactions, matchedStatement, cycle, paymentContext]
  )

  const reportScope = useMemo(
    () => buildCreditCardReportScope(matchedStatement),
    [matchedStatement]
  )

  const foreignStatements = useMemo(
    () =>
      findOverlappingForeignStatements(
        statementsData?.statements ?? [],
        cycle,
        purchasesPeriod,
        { closingDay, dueDay },
        matchedStatement?.id
      ),
    [
      statementsData?.statements,
      cycle,
      purchasesPeriod,
      closingDay,
      dueDay,
      matchedStatement?.id,
    ]
  )

  const dueDate = paymentPeriod.end
  const isPaid = metrics.remaining <= 0 && metrics.invoiceTotal > 0
  const isSettledEmpty = metrics.remaining <= 0 && metrics.invoiceTotal <= 0
  const isOverdue =
    metrics.remaining > 0 && dayjs(dueDate).isBefore(dayjs(), 'day')

  return {
    metrics,
    matchedStatement,
    purchasesPeriod,
    paymentPeriod,
    dueDate,
    isPaid,
    isSettledEmpty,
    isOverdue,
    isPending: statementsPending || transactionsPending,
    reportScope,
    foreignStatements,
    cycleTransactions,
  }
}
