import { useState } from 'react'
import dayjs from 'dayjs'
import { keepPreviousData } from '@tanstack/react-query'

import {
  useGetReportByAccount,
  useGetReportByCard,
  useGetReportByCategory,
  useGetReportDaily,
  useGetReportInsights,
  useGetReportSummary,
  useGetReportTrends,
  useListPendingSplits,
  useListRecurringTransactions,
} from '@/api/generated/api'
import { LoadingErrorState } from '@/components/loading-error-state'
import { currentMonthKey, monthKeyToRange, shiftMonth } from '@/lib/date-range'
import { formatCentsString } from '@/lib/currency'
import { pageInset, pageShell, pageSubtitle } from '@/lib/ui-classes'
import { useActiveOrganization } from '@/hooks/use-active-organization'

import { AttentionPanel } from './components/attention-panel'
import { CardSpendingCard } from './components/card-spending-card'
import { CategoryChartCard } from './components/category-chart-card'
import { DailyFlowCard } from './components/daily-flow-card'
import { DashboardKpiRow } from './components/dashboard-kpi-row'
import { InsightsCard } from './components/insights-card'
import { MonthPicker } from './components/month-picker'
import { RecurringCostCard } from './components/recurring-cost-card'
import { TrendsChartCard } from './components/trends-chart-card'

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
  const trends = useGetReportTrends(slug, { months: 6 }, {
    query: { enabled: !!slug, retry: 1 },
  })
  const daily = useGetReportDaily(slug, range, {
    query: { enabled: !!slug, retry: 1 },
  })
  const byCategory = useGetReportByCategory(
    slug,
    { ...range, type: 'expense' },
    { query: { enabled: !!slug, retry: 1 } }
  )
  const byCard = useGetReportByCard(slug, range, { query: { enabled: !!slug } })
  const byAccount = useGetReportByAccount(slug, range, { query: { enabled: !!slug } })
  const pendingSplits = useListPendingSplits(slug, { query: { enabled: !!slug } })
  const recurring = useListRecurringTransactions(slug, { query: { enabled: !!slug } })
  const insights = useGetReportInsights(slug, range, {
    query: { enabled: !!slug, staleTime: 60 * 60 * 1000 },
  })

  const isSummaryLoading = summary.isLoading && !summary.data
  const summaryError = summary.error

  const refetch = () => {
    summary.refetch()
    prevSummary.refetch()
    trends.refetch()
    daily.refetch()
    byCategory.refetch()
    byCard.refetch()
    byAccount.refetch()
    pendingSplits.refetch()
    recurring.refetch()
    insights.refetch()
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
            <DashboardKpiRow summary={summary.data} previousSummary={prevSummary.data} />
          ) : isSummaryLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="kpi-card animate-pulse">
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

          <div className="grid gap-4 xl:grid-cols-2">
            {summary.data ? (
              <AttentionPanel
                summary={summary.data}
                splits={pendingSplits.data?.splits ?? []}
              />
            ) : (
              <div className="finance-card rounded-xl border bg-white p-5 shadow-sm">
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 space-y-3">
                  <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
                  <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
                </div>
              </div>
            )}
            <InsightsCard
              insights={insights.data?.insights}
              source={insights.data?.source}
              isLoading={insights.isLoading}
              error={insights.error}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <RecurringCostCard recurring={recurring.data?.recurringTransactions} />

            <CardSpendingCard
              cards={byCard.data?.cards ?? []}
              grandTotal={byCard.data?.grandTotal ?? '0.00'}
              myGrandTotal={byCard.data?.myGrandTotal}
            />

            {byAccount.data && byAccount.data.accounts.length > 0 && (
              <div className="finance-card rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-base font-semibold text-slate-900">Saldo por conta</h3>
                <div className="space-y-2">
                  {byAccount.data.accounts.slice(0, 5).map(account => (
                    <div
                      key={account.accountId}
                      className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                    >
                      <span className="text-sm font-medium text-slate-700">{account.name}</span>
                      <span className="text-sm tabular-nums text-slate-900">
                        {formatCentsString(account.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}
