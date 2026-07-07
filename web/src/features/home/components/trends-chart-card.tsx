import type { GetReportTrends200 } from '@/api/generated/model'
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { mapTrendsToChartData } from '../lib/chart-mappers'

interface TrendsChartCardProps {
  data?: GetReportTrends200
  isLoading?: boolean
  error?: unknown
}

export function TrendsChartCard({ data, isLoading, error }: TrendsChartCardProps) {
  const chartData = data ? mapTrendsToChartData(data.months) : []

  return (
    <Card className="finance-card">
      <CardHeader>
        <CardTitle className="text-base">Evolução mensal</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-80 items-center justify-center text-sm text-slate-500">
            Carregando gráfico...
          </div>
        ) : error ? (
          <div className="flex h-80 items-center justify-center text-sm text-slate-500">
            Não foi possível carregar a evolução mensal
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-sm text-slate-500">
            Sem dados para exibir
          </div>
        ) : (
          <MonthlyTrendChart data={chartData} />
        )}
      </CardContent>
    </Card>
  )
}
