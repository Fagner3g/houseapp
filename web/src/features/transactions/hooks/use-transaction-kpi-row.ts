import { keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { useCallback, useMemo, useState } from 'react'

import { useGetReportMyExpenses, useGetReportSummary, useListPendingSplits, useListTransactions } from '@/api/generated/api'
import { useSplitTransactionIds } from '@/features/credit-cards/hooks/use-split-transaction-ids'
import { useInvoiceSummaryRows } from '@/features/transactions/hooks/use-invoice-summary-rows'
import {
  buildKpiDialogByKey,
  type KpiDialogView,
  type KpiKey,
  mapMySpendKpiItems,
  mapOverdueKpiItems,
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

  const { summaries: invoiceSummaries } = useInvoiceSummaryRows(dateFrom, dateTo, true, {
    ownedOnly: true,
  })

  const { data: pendingExpenseData } = useListTransactions(
    slug,
    {
      status: 'pending',
      type: 'expense',
      dateFrom: dateFromIso,
      dateTo: dateToIso,
      payableOnly: true,
      ownedOnly: true,
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
      ownedOnly: true,
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
      ownedOnly: true,
      perPage: 100,
    },
    { query: { enabled: !!slug, placeholderData: keepPreviousData } }
  )

  const { data: myExpenseData, isFetching: mySpendLoading } = useGetReportMyExpenses(
    slug,
    { dateFrom: dateFromIso, dateTo: dateToIso },
    { query: { enabled: !!slug && openKpi === 'mySpend' } }
  )

  const overdueDateTo = dayjs().subtract(1, 'day').endOf('day').toISOString()
  const overdueListParams = {
    dateTo: overdueDateTo,
    payableOnly: true as const,
    ownedOnly: true as const,
  }

  const { data: overdueCountData } = useListTransactions(
    slug,
    { ...overdueListParams, perPage: 1, page: 1 },
    { query: { enabled: !!slug, placeholderData: keepPreviousData } }
  )

  const { data: overdueData, isFetching: overdueLoading } = useListTransactions(
    slug,
    { ...overdueListParams, perPage: 100 },
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
        reportMyExpenseGross: moneyStringToReais(data?.myExpenseGrossTotal),
        reportMySplitsInPeriod: moneyStringToReais(data?.mySplitsInPeriodTotal),
        reportMyPendingSplits: moneyStringToReais(data?.myPendingSplitsTotal),
        reportMyPendingSplitsInPeriod: moneyStringToReais(data?.myPendingSplitsInPeriodTotal),
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

  const openInvoiceByMonth = useCallback(
    (accountId: string, monthKey: string) => {
      navigate({
        to: '/$org/accounts',
        params: { org: slug },
        search: { accountId, month: monthKey },
      })
    },
    [navigate, slug]
  )

  const openInvoice = useCallback(
    (inv: InvoiceSummaryRow) => {
      openInvoiceByMonth(inv.accountId, inv.monthKey)
    },
    [openInvoiceByMonth]
  )

  const mySpendItems = useMemo(
    () =>
      mapMySpendKpiItems({
        items: myExpenseData?.items ?? [],
        onOpenTransaction: openTransaction,
        onOpenInvoice: openInvoiceByMonth,
      }),
    [myExpenseData?.items, openTransaction, openInvoiceByMonth]
  )

  const overdueTransactionIds = useMemo(
    () => (overdueData?.transactions ?? []).map(tx => tx.id),
    [overdueData?.transactions]
  )

  const toPayTransactionIds = useMemo(
    () => (pendingExpenseData?.transactions ?? []).map(tx => tx.id),
    [pendingExpenseData?.transactions]
  )

  const toReceiveTransactionIds = useMemo(
    () => (pendingIncomeData?.transactions ?? []).map(tx => tx.id),
    [pendingIncomeData?.transactions]
  )

  const splitTransactionIds = useMemo(() => {
    if (openKpi === 'overdue') return overdueTransactionIds
    if (openKpi === 'toPay') return toPayTransactionIds
    if (openKpi === 'toReceive') return toReceiveTransactionIds
    return []
  }, [openKpi, overdueTransactionIds, toPayTransactionIds, toReceiveTransactionIds])

  const { data: splitData, isFetching: splitMetaLoading } = useSplitTransactionIds(
    slug,
    splitTransactionIds
  )
  const splitPaidById = splitData?.splitPaidById
  const payableSplitsLoading = splitTransactionIds.length > 0 && splitMetaLoading

  const toPayItems = useMemo(
    () =>
      mapToPayKpiItems({
        transactions: pendingExpenseData?.transactions ?? [],
        invoiceSummaries,
        splitPaidById,
        onOpenTransaction: openTransaction,
        onOpenInvoice: openInvoice,
      }),
    [pendingExpenseData?.transactions, invoiceSummaries, splitPaidById, openTransaction, openInvoice]
  )

  const toReceiveItems = useMemo(
    () =>
      mapToReceiveKpiItems({
        transactions: pendingIncomeData?.transactions ?? [],
        splitPaidById,
        onOpenTransaction: openTransaction,
      }),
    [pendingIncomeData?.transactions, splitPaidById, openTransaction]
  )

  const { items: splitItems, secondaryItems: splitSecondaryItems } = useMemo(
    () =>
      mapPendingSplitKpiItems({
        splits: pendingSplitsData?.splits ?? [],
        dateTo,
        onOpenTransaction: openTransaction,
      }),
    [pendingSplitsData?.splits, dateTo, openTransaction]
  )

  const overdueItems = useMemo(
    () =>
      mapOverdueKpiItems({
        transactions: overdueData?.transactions ?? [],
        splitPaidById,
        onOpenTransaction: openTransaction,
      }),
    [overdueData?.transactions, splitPaidById, openTransaction]
  )

  const overdueCount = overdueCountData?.pagination?.total ?? data?.overdueCount ?? 0

  const cards: TransactionKpiCard[] = [
    {
      key: 'mySpend',
      label: 'Meu gasto',
      value: formatCurrency(kpis.myPaid),
      subtitle:
        kpis.mySplitsInPeriod > 0
          ? 'Faturas e despesas, menos splits'
          : 'Faturas e despesas no período',
      icon: 'mySpend',
      iconClass: 'text-rose-500',
      valueClass: 'text-slate-900',
      clickable: kpis.myPaid > 0,
    },
    {
      key: 'pendingSplits',
      label: 'Splits a receber',
      value: formatCurrency(kpis.myPendingSplitsInPeriod),
      subtitle:
        kpis.myPendingSplits > kpis.myPendingSplitsInPeriod
          ? `Em aberto: ${formatCurrency(kpis.myPendingSplits)}`
          : 'Já descontado acima; falta receber',
      icon: 'pendingSplits',
      iconClass: 'text-amber-500',
      valueClass: kpis.myPendingSplitsInPeriod > 0 ? 'text-amber-600' : 'text-slate-900',
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
    mySpendItems,
    splitItems,
    splitSecondaryItems,
    toPayItems,
    toReceiveItems,
    overdueItems,
    mySpendLoading,
    splitsLoading,
    overdueLoading: overdueLoading || payableSplitsLoading,
  })

  const activeDialog: KpiDialogView | null = openKpi ? dialogByKey[openKpi] : null

  return {
    cards,
    openKpi,
    setOpenKpi,
    activeDialog,
  }
}
