import dayjs from 'dayjs'
import { BarChart3, CalendarDays, Repeat, Store, Tag } from 'lucide-react'
import type { ElementType } from 'react'

import { useGetReportByCategory, useGetReportTopMerchants } from '@/api/generated/api'
import { CategoryBreakdownChart } from '@/components/charts/category-breakdown-chart'
import {
  ExpenseRankingList,
  formatMerchantSubtitle,
  type ExpenseRankingItem,
} from '@/components/expense-ranking-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mapCategoryToChartData } from '@/features/home/lib/chart-mappers'
import type { BillingCycle } from '@/lib/billing-cycle'
import {
  formatDateRange,
  formatImportedPurchasePeriodRange,
} from '@/lib/billing-cycle'
import { formatCurrency, moneyStringToReais } from '@/lib/currency'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { cn } from '@/lib/utils'
import { useDrawerStore, type AnalyticsGroupContext } from '@/stores/drawers'

import { useCreditCardInvoiceMetrics } from '../hooks/use-credit-card-invoice-metrics'
import { CreditCardAnalyticsSkeleton } from './credit-card-invoice-skeletons'

interface CreditCardAnalyticsSectionProps {
  accountId: string
  accountName: string
  cycle: BillingCycle
  closingDay: number
  dueDay: number
}

function AnalyticsStat({
  icon: Icon,
  label,
  value,
  iconClass,
}: {
  icon: ElementType
  label: string
  value: string
  iconClass: string
}) {
  return (
    <div className="rounded-lg border border-violet-100/80 bg-white/70 px-3 py-2.5 backdrop-blur-sm">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={cn('size-3.5', iconClass)} />
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <p className="text-lg font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
    </div>
  )
}

function AnalyticsError({ message }: { message: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}

export function CreditCardAnalyticsSection({
  accountId,
  accountName,
  cycle,
  closingDay,
  dueDay,
}: CreditCardAnalyticsSectionProps) {
  const { slug } = useActiveOrganization()
  const openAnalyticsGroupDrawer = useDrawerStore(s => s.openAnalyticsGroupDrawer)
  const { purchasesPeriod, metrics, isPending } = useCreditCardInvoiceMetrics(
    accountId,
    cycle,
    closingDay,
    dueDay
  )

  const dateFrom = dayjs(purchasesPeriod.start).startOf('day').toISOString()
  const dateTo = dayjs(purchasesPeriod.end).endOf('day').toISOString()
  const purchasesLabel = metrics.usesImportedStatementPeriod
    ? formatImportedPurchasePeriodRange(purchasesPeriod.start, purchasesPeriod.end)
    : formatDateRange(cycle.periodStart, cycle.periodEnd)

  const reportParams = {
    dateFrom,
    dateTo,
    accountId,
    scope: 'credit_card' as const,
  }

  const byCategory = useGetReportByCategory(
    slug,
    { ...reportParams, type: 'expense', personal: true },
    { query: { enabled: !!slug && !!accountId } }
  )
  const topMerchants = useGetReportTopMerchants(
    slug,
    { ...reportParams, limit: 15 },
    { query: { enabled: !!slug && !!accountId } }
  )

  const isLoading = isPending || byCategory.isLoading || topMerchants.isLoading
  const categories = byCategory.data?.categories ?? []
  const merchants = topMerchants.data?.merchants ?? []
  const grandTotal = topMerchants.data?.grandTotal ?? '0'
  const mySpend = moneyStringToReais(grandTotal)
  const recurringCount = merchants.filter(merchant => merchant.isRecurring).length
  const chartData = mapCategoryToChartData(categories)

  const openGroup = (item: ExpenseRankingItem, groupType: AnalyticsGroupContext['groupType']) => {
    window.requestAnimationFrame(() => {
      openAnalyticsGroupDrawer({
        accountId,
        accountName,
        cycleLabel: cycle.label,
        purchasesLabel,
        purchasesPeriod,
        groupType,
        groupKey: item.id,
        label: item.label,
        total: item.total,
        occurrenceCount: item.occurrenceCount,
        color: groupType === 'category' ? item.color : undefined,
      })
    })
  }

  if (isLoading) {
    return <CreditCardAnalyticsSkeleton />
  }

  return (
    <div className="space-y-4 px-4 py-3 lg:px-6">
      <div className="overflow-hidden rounded-xl border border-violet-200/60 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50/80 via-white to-white px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-violet-600" />
            <span className="text-sm font-medium text-violet-700">Análise da fatura</span>
          </div>

          <p className="mt-3 text-4xl font-bold tabular-nums tracking-tight text-slate-900">
            {formatCurrency(mySpend)}
          </p>
          <p className="mt-1 text-sm text-slate-600">Meu gasto no período de compras</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span>{accountName}</span>
            <span className="hidden text-slate-300 sm:inline">·</span>
            <span>Fatura de {cycle.label}</span>
            <span className="hidden text-slate-300 sm:inline">·</span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" />
              Compras {purchasesLabel}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AnalyticsStat
              icon={Tag}
              label="Categorias"
              value={String(categories.length)}
              iconClass="text-violet-500"
            />
            <AnalyticsStat
              icon={Store}
              label="Estabelecimentos"
              value={String(merchants.length)}
              iconClass="text-blue-500"
            />
            <AnalyticsStat
              icon={Repeat}
              label="Recorrentes"
              value={String(recurringCount)}
              iconClass="text-amber-500"
            />
            <AnalyticsStat
              icon={BarChart3}
              label="Ticket médio"
              value={
                merchants.length > 0
                  ? formatCurrency(mySpend / merchants.length)
                  : '—'
              }
              iconClass="text-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="finance-card">
          <CardHeader>
            <CardTitle className="text-base">Gastos por categoria</CardTitle>
            <p className="text-sm text-slate-500">
              Meu gasto no período de compras da fatura · toque para ver as compras
            </p>
          </CardHeader>
          <CardContent>
            {byCategory.error ? (
              <AnalyticsError message="Não foi possível carregar as categorias" />
            ) : categories.length === 0 ? (
              <AnalyticsError message="Nenhuma compra categorizada nesta fatura" />
            ) : (
              <div className="space-y-4">
                <CategoryBreakdownChart data={chartData} compact />
                <div className="border-t border-slate-100 pt-2">
                  <ExpenseRankingList
                    items={categories.map(category => ({
                      id: category.categoryId,
                      label: category.name,
                      total: category.total,
                      percentage: category.percentage,
                      color: category.color,
                    }))}
                    grandTotal={grandTotal}
                    emptyMessage="Nenhuma compra categorizada nesta fatura"
                    onItemClick={item => openGroup(item, 'category')}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="finance-card">
          <CardHeader>
            <CardTitle className="text-base">Maiores estabelecimentos</CardTitle>
            <p className="text-sm text-slate-500">
              Agrupados pelo nome na fatura · recorrente = 2 ou mais compras · toque para ver
            </p>
          </CardHeader>
          <CardContent>
            {topMerchants.error ? (
              <AnalyticsError message="Não foi possível carregar os estabelecimentos" />
            ) : (
              <ExpenseRankingList
                showRank
                items={merchants.map(merchant => ({
                  id: merchant.key,
                  label: merchant.label,
                  total: merchant.total,
                  percentage: merchant.percentage,
                  isRecurring: merchant.isRecurring,
                  occurrenceCount: merchant.occurrenceCount,
                  subtitle: formatMerchantSubtitle(
                    merchant.occurrenceCount,
                    merchant.avgAmount,
                    merchant.lastDate
                  ),
                }))}
                grandTotal={grandTotal}
                emptyMessage="Nenhuma compra nesta fatura"
                onItemClick={item => openGroup(item, 'merchant')}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
