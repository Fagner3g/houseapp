import dayjs from 'dayjs'
import { keepPreviousData } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useGetReportSummary, useListTransactions } from '@/api/generated/api'
import { useInvoiceSummaryRows } from '@/features/transactions/hooks/use-invoice-summary-rows'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { monthKeyToRange } from '@/lib/date-range'
import { moneyStringToReais } from '@/lib/currency'
import { computeTransactionKpis } from '@/lib/transaction-kpi'

export function usePeriodCashFlowKpis(monthKey: string) {
  const { slug } = useActiveOrganization()
  const { dateFrom, dateTo } = monthKeyToRange(monthKey)
  const dateFromIso = dayjs(dateFrom).startOf('day').toISOString()
  const dateToIso = dayjs(dateTo).endOf('day').toISOString()

  const summary = useGetReportSummary(
    slug,
    { dateFrom: dateFromIso, dateTo: dateToIso },
    { query: { enabled: !!slug, placeholderData: keepPreviousData } }
  )

  const { summaries: invoiceSummaries } = useInvoiceSummaryRows(dateFrom, dateTo, !!slug)

  const pendingExpense = useListTransactions(
    slug,
    {
      status: 'pending',
      type: 'expense',
      dateFrom: dateFromIso,
      dateTo: dateToIso,
      payableOnly: true,
      perPage: 100,
    },
    { query: { enabled: !!slug, placeholderData: keepPreviousData } }
  )

  const pendingIncome = useListTransactions(
    slug,
    {
      status: 'pending',
      type: 'income',
      dateFrom: dateFromIso,
      dateTo: dateToIso,
      payableOnly: true,
      perPage: 100,
    },
    { query: { enabled: !!slug, placeholderData: keepPreviousData } }
  )

  const paidExpense = useListTransactions(
    slug,
    {
      status: 'paid',
      type: 'expense',
      dateFrom: dateFromIso,
      dateTo: dateToIso,
      payableOnly: true,
      perPage: 100,
    },
    { query: { enabled: !!slug, placeholderData: keepPreviousData } }
  )

  const kpis = useMemo(
    () =>
      computeTransactionKpis({
        reportTotalIncome: moneyStringToReais(summary.data?.totalIncome),
        reportTotalExpense: moneyStringToReais(summary.data?.totalExpense),
        reportMyExpense: moneyStringToReais(summary.data?.myExpenseTotal),
        reportMyPendingSplits: moneyStringToReais(summary.data?.myPendingSplitsTotal),
        paidPayableExpenses: paidExpense.data?.transactions ?? [],
        pendingPayableExpenses: pendingExpense.data?.transactions ?? [],
        pendingIncomeAmounts: pendingIncome.data?.transactions.map(t => t.amount) ?? [],
        invoiceSummaries,
      }),
    [summary.data, paidExpense.data, pendingExpense.data, pendingIncome.data, invoiceSummaries]
  )

  const isLoading =
    summary.isLoading ||
    pendingExpense.isLoading ||
    pendingIncome.isLoading ||
    paidExpense.isLoading

  return {
    pendingExpense: kpis.pendingExpense,
    pendingIncome: kpis.pendingIncome,
    isLoading,
  }
}
