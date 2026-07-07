import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

import type { GetReportTrends200 } from '@/api/generated/model'
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { mapTrendsToChartData } from '../lib/chart-mappers'

dayjs.locale('pt-br')

interface TrendsChartCardProps {
  data?: GetReportTrends200
  monthKey?: string
  isLoading?: boolean
  error?: unknown
}

export function TrendsChartCard({ data, monthKey, isLoading, error }: TrendsChartCardProps) {
  const chartData = data ? mapTrendsToChartData(data.months) : []
  const subtitle = monthKey
    ? `Últimos 6 meses até ${dayjs(`${monthKey}-01`).format('MMMM [de] YYYY')}`
    : 'Últimos 6 meses'

  return (
    <Card className="finance-card">
      <CardHeader>
        <CardTitle className="text-base">Evolução mensal</CardTitle>
        <p className="text-sm text-slate-500">{subtitle}</p>
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
