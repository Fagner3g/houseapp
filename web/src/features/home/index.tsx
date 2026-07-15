import { useState } from 'react'
import dayjs from 'dayjs'
import { keepPreviousData } from '@tanstack/react-query'

import {
  useGetReportByAccount,
  useGetReportByCategory,
  useGetReportDaily,
  useGetReportSummary,
  useGetReportTrends,
  useListRecurringTransactions,
} from '@/api/generated/api'
import { LoadingErrorState } from '@/components/loading-error-state'
import { formatCurrency, moneyStringToReais } from '@/lib/currency'
import { currentMonthKey, monthKeyToRange, shiftMonth } from '@/lib/date-range'
import { pageInset, pageShell, pageSubtitle } from '@/lib/ui-classes'
import { useActiveOrganization } from '@/hooks/use-active-organization'

import { AccountBalancesCard } from './components/account-balances-card'
import { CategoryChartCard } from './components/category-chart-card'
import { DailyFlowCard } from './components/daily-flow-card'
import { DashboardKpiRow } from './components/dashboard-kpi-row'
import { MonthPicker } from './components/month-picker'
import { OpenInvoicesCard } from './components/open-invoices-card'
import { RecurringCostCard } from './components/recurring-cost-card'
import { RecurringIncomeCard } from './components/recurring-income-card'
import { TrendsChartCard } from './components/trends-chart-card'
import { usePeriodCashFlowKpis } from './hooks/use-period-cash-flow-kpis'

function toIsoRange(monthKey: string) {
  const { dateFrom, dateTo } = monthKeyToRange(monthKey)
  return {
    dateFrom: dayjs(dateFrom).startOf('day').toISOString(),
    dateTo: dayjs(dateTo).endOf('day').toISOString(),
  }
}

export function HomePage() {
  const { slug } = useActiveOrganization()
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const range = toIsoRange(monthKey)
  const prevRange = toIsoRange(shiftMonth(monthKey, -1))

  const summary = useGetReportSummary(slug, range, {
    query: { enabled: !!slug, placeholderData: keepPreviousData },
  })
  const prevSummary = useGetReportSummary(slug, prevRange, {
    query: { enabled: !!slug, placeholderData: keepPreviousData },
  })
  const trends = useGetReportTrends(slug, { months: 6, endMonth: currentMonthKey() }, {
    query: { enabled: !!slug, retry: 1 },
  })
  const daily = useGetReportDaily(slug, range, {
    query: { enabled: !!slug, retry: 1 },
  })
  const byCategory = useGetReportByCategory(
    slug,
    { ...range, type: 'expense', personal: true },
    { query: { enabled: !!slug, retry: 1 } }
  )
  const byAccount = useGetReportByAccount(slug, range, { query: { enabled: !!slug } })
  const recurring = useListRecurringTransactions(slug, { query: { enabled: !!slug } })
  const cashFlow = usePeriodCashFlowKpis(monthKey)

  const isSummaryLoading = summary.isLoading && !summary.data
  const summaryError = summary.error

  const refetch = () => {
    summary.refetch()
    prevSummary.refetch()
    trends.refetch()
    daily.refetch()
    byCategory.refetch()
    byAccount.refetch()
    recurring.refetch()
  }

  if (summaryError) {
    return (
      <LoadingErrorState
        error={summaryError}
        onRetry={refetch}
        title="Erro ao carregar dashboard"
        description="Não foi possível carregar os dados."
      />
    )
  }

  return (
    <div className={pageShell}>
        <div className={`${pageInset} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
          <p className={pageSubtitle}>Visão geral financeira</p>
          <MonthPicker monthKey={monthKey} onChange={setMonthKey} />
        </div>

        <div className="flex flex-col gap-4 px-4 lg:px-6">
          {summary.data ? (
            <DashboardKpiRow
              summary={summary.data}
              previousSummary={prevSummary.data}
              pendingExpense={cashFlow.pendingExpense}
              cashFlowLoading={cashFlow.isLoading}
            />
          ) : isSummaryLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map(i => (
                <div key={`sk-${i}`} className="kpi-card animate-pulse">
                  <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
                  <div className="h-8 w-32 rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <TrendsChartCard
              data={trends.data}
              selectedMonthKey={monthKey}
              onMonthSelect={setMonthKey}
              isLoading={trends.isLoading}
              error={trends.error}
            />
            <CategoryChartCard
              data={byCategory.data}
              isLoading={byCategory.isLoading}
              error={byCategory.error}
            />
          </div>

          <DailyFlowCard
            data={daily.data}
            isLoading={daily.isLoading}
            error={daily.error}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <RecurringIncomeCard
              recurring={recurring.data?.recurringTransactions}
              isLoading={recurring.isLoading}
            />

            <RecurringCostCard
              recurring={recurring.data?.recurringTransactions}
              isLoading={recurring.isLoading}
            />

            <OpenInvoicesCard monthKey={monthKey} />

            <AccountBalancesCard
              data={byAccount.data}
              netWorth={
                summary.data ? formatCurrency(moneyStringToReais(summary.data.netWorth)) : undefined
              }
              isLoading={byAccount.isLoading}
              error={byAccount.error}
            />
          </div>
        </div>
    </div>
  )
}
