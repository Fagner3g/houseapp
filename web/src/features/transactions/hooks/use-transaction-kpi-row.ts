import { keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { useCallback, useMemo, useState } from 'react'

import { useGetReportSummary, useListPendingSplits, useListTransactions } from '@/api/generated/api'
import { useInvoiceSummaryRows } from '@/features/transactions/hooks/use-invoice-summary-rows'
import {
  buildKpiDialogByKey,
  type KpiDialogView,
  type KpiKey,
  mapOverdueKpiItems,
  mapPaidExpenseKpiItems,
  mapPendingSplitKpiItems,
  mapToPayKpiItems,
  mapToReceiveKpiItems,
} from '@/features/transactions/lib/kpi-summary'
import type { InvoiceSummaryRow } from '@/features/transactions/types'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { formatCurrency, moneyStringToReais } from '@/lib/currency'
import { computeTransactionKpis } from '@/lib/transaction-kpi'
import { useDrawerStore } from '@/stores/drawers'
import { useTransactionListQueryStore } from '@/stores/transaction-list-query'

export type TransactionKpiCard = {
  key: KpiKey
  label: string
  value: string
  subtitle: string
  icon: 'mySpend' | 'pendingSplits' | 'toPay' | 'toReceive' | 'overdue'
  iconClass: string
  valueClass: string
  clickable: boolean
}

export function useTransactionKpiRow() {
  const { slug } = useActiveOrganization()
  const navigate = useNavigate()
  const openTransactionDrawer = useDrawerStore(s => s.openTransactionDrawer)
  const { dateFrom, dateTo } = useTransactionListQueryStore()
  const [openKpi, setOpenKpi] = useState<KpiKey | null>(null)

  const dateFromIso = dayjs(dateFrom).startOf('day').toISOString()
  const dateToIso = dayjs(dateTo).endOf('day').toISOString()

  const { data } = useGetReportSummary(
    slug,
    { dateFrom: dateFromIso, dateTo: dateToIso },
    { query: { enabled: !!slug, placeholderData: keepPreviousData } }
  )

  const { summaries: invoiceSummaries } = useInvoiceSummaryRows(dateFrom, dateTo)

  const { data: pendingExpenseData } = useListTransactions(
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

  const { data: pendingIncomeData } = useListTransactions(
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

  const { data: paidExpenseData } = useListTransactions(
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

  const { data: overdueData, isFetching: overdueLoading } = useListTransactions(
    slug,
    {
      status: 'pending',
      dateTo: dayjs().subtract(1, 'day').endOf('day').toISOString(),
      payableOnly: true,
      perPage: 100,
    },
    { query: { enabled: !!slug && openKpi === 'overdue' } }
  )

  const { data: pendingSplitsData, isFetching: splitsLoading } = useListPendingSplits(slug, {
    query: { enabled: !!slug && openKpi === 'pendingSplits' },
  })

  const kpis = useMemo(
    () =>
      computeTransactionKpis({
        reportTotalIncome: moneyStringToReais(data?.totalIncome),
        reportTotalExpense: moneyStringToReais(data?.totalExpense),
        reportMyExpense: moneyStringToReais(data?.myExpenseTotal),
        reportMyPendingSplits: moneyStringToReais(data?.myPendingSplitsTotal),
        paidPayableExpenses: paidExpenseData?.transactions ?? [],
        pendingPayableExpenses: pendingExpenseData?.transactions ?? [],
        pendingIncomeAmounts: pendingIncomeData?.transactions.map(t => t.amount) ?? [],
        invoiceSummaries,
      }),
    [data, paidExpenseData, pendingExpenseData, pendingIncomeData, invoiceSummaries]
  )

  const openTransaction = useCallback(
    (id: string) => openTransactionDrawer(undefined, id),
    [openTransactionDrawer]
  )

  const openInvoice = useCallback(
    (inv: InvoiceSummaryRow) => {
      navigate({
        to: '/$org/accounts',
        params: { org: slug },
        search: { accountId: inv.accountId, month: inv.monthKey },
      })
    },
    [navigate, slug]
  )

  const paidExpenseItems = useMemo(
    () =>
      mapPaidExpenseKpiItems({
        transactions: paidExpenseData?.transactions ?? [],
        invoiceSummaries,
        onOpenTransaction: openTransaction,
        onOpenInvoice: openInvoice,
      }),
    [paidExpenseData?.transactions, invoiceSummaries, openTransaction, openInvoice]
  )

  const toPayItems = useMemo(
    () =>
      mapToPayKpiItems({
        transactions: pendingExpenseData?.transactions ?? [],
        invoiceSummaries,
        onOpenTransaction: openTransaction,
        onOpenInvoice: openInvoice,
      }),
    [pendingExpenseData?.transactions, invoiceSummaries, openTransaction, openInvoice]
  )

  const toReceiveItems = useMemo(
    () =>
      mapToReceiveKpiItems({
        transactions: pendingIncomeData?.transactions ?? [],
        onOpenTransaction: openTransaction,
      }),
    [pendingIncomeData?.transactions, openTransaction]
  )

  const splitItems = useMemo(
    () =>
      mapPendingSplitKpiItems({
        splits: pendingSplitsData?.splits ?? [],
        onOpenTransaction: openTransaction,
      }),
    [pendingSplitsData?.splits, openTransaction]
  )

  const overdueItems = useMemo(
    () =>
      mapOverdueKpiItems({
        transactions: overdueData?.transactions ?? [],
        onOpenTransaction: openTransaction,
      }),
    [overdueData?.transactions, openTransaction]
  )

  const overdueCount = data?.overdueCount ?? 0

  const cards: TransactionKpiCard[] = [
    {
      key: 'mySpend',
      label: 'Meu gasto',
      value: formatCurrency(kpis.myPaid),
      subtitle:
        kpis.paid > kpis.myPaid
          ? `De ${formatCurrency(kpis.paid)} pagos pela casa`
          : 'Quanto efetivamente saiu do seu bolso',
      icon: 'mySpend',
      iconClass: 'text-rose-500',
      valueClass: 'text-slate-900',
      clickable: kpis.myPaid > 0,
    },
    {
      key: 'pendingSplits',
      label: 'Splits a receber',
      value: formatCurrency(kpis.myPendingSplits),
      subtitle: 'Já descontado acima; falta receber',
      icon: 'pendingSplits',
      iconClass: 'text-amber-500',
      valueClass: kpis.myPendingSplits > 0 ? 'text-amber-600' : 'text-slate-900',
      clickable: kpis.myPendingSplits > 0,
    },
    {
      key: 'toPay',
      label: 'A pagar',
      value: formatCurrency(kpis.pendingExpense),
      subtitle: 'Despesas e faturas em aberto no período',
      icon: 'toPay',
      iconClass: 'text-amber-500',
      valueClass: 'text-slate-900',
      clickable: kpis.pendingExpense > 0,
    },
    {
      key: 'toReceive',
      label: 'A receber',
      value: formatCurrency(kpis.pendingIncome),
      subtitle: 'Receitas ainda não recebidas no período',
      icon: 'toReceive',
      iconClass: 'text-emerald-500',
      valueClass: 'text-slate-900',
      clickable: kpis.pendingIncome > 0,
    },
    {
      key: 'overdue',
      label: 'Vencidos',
      value: String(overdueCount),
      subtitle: 'Lançamentos com data já passada',
      icon: 'overdue',
      iconClass: 'text-rose-500',
      valueClass: overdueCount > 0 ? 'text-rose-600' : 'text-slate-900',
      clickable: overdueCount > 0,
    },
  ]

  const dialogByKey = buildKpiDialogByKey({
    kpis,
    overdueCount,
    paidExpenseItems,
    splitItems,
    toPayItems,
    toReceiveItems,
    overdueItems,
    splitsLoading,
    overdueLoading,
  })

  const activeDialog: KpiDialogView | null = openKpi ? dialogByKey[openKpi] : null

  return {
    cards,
    openKpi,
    setOpenKpi,
    activeDialog,
  }
}
