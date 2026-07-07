import { useGetReportSummary, useListTransactions } from '@/api/generated/api'
import dayjs from 'dayjs'
import { AlertCircle, CircleMinus, CirclePlus, Clock } from 'lucide-react'
import { keepPreviousData } from '@tanstack/react-query'
import { useMemo } from 'react'

import { formatCurrency, moneyStringToReais } from '@/lib/currency'
import { computeTransactionKpis } from '@/lib/transaction-kpi'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useInvoiceSummaryRows } from '@/features/transactions/hooks/use-invoice-summary-rows'
import { useTransactionListQueryStore } from '@/stores/transaction-list-query'
import { cn } from '@/lib/utils'

export function TransactionKpiRow() {
  const { slug } = useActiveOrganization()
  const { dateFrom, dateTo } = useTransactionListQueryStore()

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

  const cards = [
    {
      label: 'Meu gasto',
      value: formatCurrency(kpis.myPaid),
      subtitle: 'Despesas pagas no período (líquido de splits)',
      icon: CircleMinus,
      iconClass: 'text-rose-500',
      valueClass: 'text-slate-900',
    },
    {
      label: 'Splits a receber',
      value: formatCurrency(kpis.myPendingSplits),
      subtitle: 'Pendente de outras pessoas',
      icon: CirclePlus,
      iconClass: 'text-amber-500',
      valueClass: kpis.myPendingSplits > 0 ? 'text-amber-600' : 'text-slate-900',
    },
    {
      label: 'A pagar',
      value: formatCurrency(kpis.pendingExpense),
      subtitle: 'Pendente no período',
      icon: Clock,
      iconClass: 'text-amber-500',
      valueClass: 'text-slate-900',
    },
    {
      label: 'A receber',
      value: formatCurrency(kpis.pendingIncome),
      subtitle: 'Receitas pendentes no período',
      icon: CirclePlus,
      iconClass: 'text-emerald-500',
      valueClass: 'text-slate-900',
    },
    {
      label: 'Vencidos',
      value: String(data?.overdueCount ?? 0),
      subtitle: 'Lançamentos em atraso',
      icon: AlertCircle,
      iconClass: 'text-rose-500',
      valueClass: (data?.overdueCount ?? 0) > 0 ? 'text-rose-600' : 'text-slate-900',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 xl:grid-cols-5 lg:px-6">
      {cards.map(card => (
        <div key={card.label} className="kpi-card">
          <div className="mb-3 flex items-center gap-2">
            <card.icon className={cn('size-4', card.iconClass)} />
            <span className="text-sm font-medium text-slate-600">{card.label}</span>
          </div>
          <p className={cn('text-2xl font-bold tabular-nums tracking-tight', card.valueClass)}>
            {card.value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
        </div>
      ))}
    </div>
  )
}
