import type { GetReportByCategory200 } from '@/api/generated/model'
import { CategoryBreakdownChart } from '@/components/charts/category-breakdown-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { mapCategoryToChartData } from '../lib/chart-mappers'

interface CategoryChartCardProps {
  data?: GetReportByCategory200
  isLoading?: boolean
  error?: unknown
}

export function CategoryChartCard({ data, isLoading, error }: CategoryChartCardProps) {
  const chartData = data ? mapCategoryToChartData(data.categories) : []

  return (
    <Card className="finance-card">
      <CardHeader>
        <CardTitle className="text-base">Gastos por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-80 items-center justify-center text-sm text-slate-500">
            Carregando gráfico...
          </div>
        ) : error ? (
          <div className="flex h-80 items-center justify-center text-sm text-slate-500">
            Não foi possível carregar as categorias
          </div>
        ) : (
          <CategoryBreakdownChart data={chartData} />
        )}
      </CardContent>
    </Card>
  )
}
