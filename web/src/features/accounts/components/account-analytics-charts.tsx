import dayjs from 'dayjs'
import { useMemo } from 'react'

import { CategoryBreakdownChart } from '@/components/charts/category-breakdown-chart'
import { ExpenseRankingList } from '@/components/expense-ranking-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mapCategoryToChartData } from '@/features/home/lib/chart-mappers'
import type { GetReportByCategory200CategoriesItem } from '@/api/generated/model'
import type { GetReportTopMerchants200MerchantsItem } from '@/api/generated/model'

const TOP_MERCHANTS_LIMIT = 15

interface AccountAnalyticsChartsProps {
  categories: GetReportByCategory200CategoriesItem[]
  merchants: GetReportTopMerchants200MerchantsItem[]
  grandTotal: string
  categoryLoading: boolean
  categoryError: boolean
  merchantLoading: boolean
  merchantError: boolean
  onCategoryClick: (item: {
    id: string
    label: string
    total: string
    color?: string | null
  }) => void
  onMerchantClick: (item: {
    id: string
    label: string
    total: string
    occurrenceCount?: number
  }) => void
}

export function AccountAnalyticsCharts({
  categories,
  merchants,
  grandTotal,
  categoryLoading,
  categoryError,
  merchantLoading,
  merchantError,
  onCategoryClick,
  onMerchantClick,
}: AccountAnalyticsChartsProps) {
  const chartData = useMemo(() => mapCategoryToChartData(categories), [categories])

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="finance-card">
        <CardHeader>
          <CardTitle className="text-base">Gastos por categoria</CardTitle>
          <p className="text-sm text-slate-500">Despesas categorizadas no período</p>
        </CardHeader>
        <CardContent>
          {categoryLoading ? (
            <p className="py-12 text-center text-sm text-slate-500">Carregando...</p>
          ) : categoryError ? (
            <p className="py-12 text-center text-sm text-slate-500">
              Não foi possível carregar as categorias
            </p>
          ) : categories.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              Nenhuma despesa categorizada neste mês
            </p>
          ) : (
            <div className="space-y-4">
              <CategoryBreakdownChart data={chartData} compact />
              <ExpenseRankingList
                items={categories.map(category => ({
                  id: category.categoryId,
                  label: category.name,
                  total: category.total,
                  percentage: category.percentage,
                  color: category.color,
                }))}
                grandTotal={grandTotal}
                emptyMessage="Nenhuma despesa categorizada neste mês"
                onItemClick={onCategoryClick}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="finance-card">
        <CardHeader>
          <CardTitle className="text-base">Maiores estabelecimentos</CardTitle>
          <p className="text-sm text-slate-500">
            Top {TOP_MERCHANTS_LIMIT} por valor no período
          </p>
        </CardHeader>
        <CardContent>
          {merchantLoading ? (
            <p className="py-12 text-center text-sm text-slate-500">Carregando...</p>
          ) : merchantError ? (
            <p className="py-12 text-center text-sm text-slate-500">
              Não foi possível carregar os estabelecimentos
            </p>
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
              }))}
              grandTotal={grandTotal}
              emptyMessage="Nenhum estabelecimento neste mês"
              onItemClick={onMerchantClick}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export { TOP_MERCHANTS_LIMIT }

export function formatAccountAnalyticsPeriodLabel(dateFrom: string, dateTo: string) {
  return `${dayjs(dateFrom).format('DD/MM')} – ${dayjs(dateTo).format('DD/MM/YYYY')}`
}
