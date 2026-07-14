import dayjs from 'dayjs'
import { Store, Tag } from 'lucide-react'

import { useGetReportByCategory, useGetReportTopMerchants } from '@/api/generated/api'
import { AccountAnalyticsCharts, TOP_MERCHANTS_LIMIT } from '@/features/accounts/components/account-analytics-charts'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { formatCurrency, moneyStringToReais } from '@/lib/currency'
import { monthKeyToRange } from '@/lib/date-range'
import { cn } from '@/lib/utils'
import { useDrawerStore } from '@/stores/drawers'

interface AccountAnalyticsSectionProps {
  accountId: string
  accountName: string
  monthKey: string
}

function AnalyticsStat({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string
  value: string
  icon: typeof Tag
  iconClass: string
}) {
  return (
    <div className="kpi-card">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={cn('size-4', iconClass)} />
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
    </div>
  )
}

export function AccountAnalyticsSection({
  accountId,
  accountName,
  monthKey,
}: AccountAnalyticsSectionProps) {
  const { slug } = useActiveOrganization()
  const openAnalyticsGroupDrawer = useDrawerStore(s => s.openAnalyticsGroupDrawer)
  const { dateFrom, dateTo, label } = monthKeyToRange(monthKey)
  const dateFromIso = dayjs(dateFrom).startOf('day').toISOString()
  const dateToIso = dayjs(dateTo).endOf('day').toISOString()
  const monthLabel = label.charAt(0).toUpperCase() + label.slice(1)
  const purchasesLabel = `${dayjs(dateFrom).format('DD/MM')} – ${dayjs(dateTo).format('DD/MM/YYYY')}`

  const reportParams = {
    dateFrom: dateFromIso,
    dateTo: dateToIso,
    accountId,
    scope: 'all' as const,
    type: 'expense' as const,
  }

  const byCategory = useGetReportByCategory(slug, reportParams, {
    query: { enabled: !!slug && !!accountId },
  })
  const topMerchants = useGetReportTopMerchants(
    slug,
    { ...reportParams, limit: TOP_MERCHANTS_LIMIT },
    { query: { enabled: !!slug && !!accountId } }
  )

  const categories = byCategory.data?.categories ?? []
  const merchants = topMerchants.data?.merchants ?? []
  const grandTotal = topMerchants.data?.grandTotal ?? '0'

  const openGroup = (
    groupType: 'category' | 'merchant',
    item: { id: string; label: string; total: string; occurrenceCount?: number; color?: string | null }
  ) => {
    openAnalyticsGroupDrawer({
      accountId,
      accountName,
      cycleLabel: monthLabel,
      purchasesLabel,
      purchasesPeriod: { start: dateFrom, end: dateTo },
      statementId: null,
      groupType,
      groupKey: item.id,
      label: item.label,
      total: item.total,
      occurrenceCount: item.occurrenceCount,
      color: groupType === 'category' ? item.color : undefined,
    })
  }

  return (
    <div className="space-y-6 px-4 py-4 lg:px-6">
      <div>
        <p className="text-sm text-slate-500">
          {accountName} · {monthLabel}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <AnalyticsStat
            label="Despesas do mês"
            value={formatCurrency(moneyStringToReais(grandTotal))}
            icon={Tag}
            iconClass="text-rose-500"
          />
          <AnalyticsStat
            label="Estabelecimentos"
            value={String(topMerchants.data?.merchantCount ?? merchants.length)}
            icon={Store}
            iconClass="text-violet-500"
          />
        </div>
      </div>

      <AccountAnalyticsCharts
        categories={categories}
        merchants={merchants}
        grandTotal={grandTotal}
        categoryLoading={byCategory.isLoading}
        categoryError={!!byCategory.error}
        merchantLoading={topMerchants.isLoading}
        merchantError={!!topMerchants.error}
        onCategoryClick={item => openGroup('category', item)}
        onMerchantClick={item => openGroup('merchant', item)}
      />
    </div>
  )
}
