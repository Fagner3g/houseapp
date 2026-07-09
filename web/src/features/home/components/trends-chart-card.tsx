import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

import type { GetReportTrends200 } from '@/api/generated/model'
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { currentMonthKey } from '@/lib/date-range'

import { mapTrendsToChartData } from '../lib/chart-mappers'

dayjs.locale('pt-br')

interface TrendsChartCardProps {
  data?: GetReportTrends200
  selectedMonthKey?: string
  onMonthSelect?: (monthKey: string) => void
  isLoading?: boolean
  error?: unknown
}

export function TrendsChartCard({ data, selectedMonthKey, onMonthSelect, isLoading, error }: TrendsChartCardProps) {
  const chartData = data ? mapTrendsToChartData(data.months) : []
  const subtitle = `Últimos 6 meses até ${dayjs(`${currentMonthKey()}-01`).format('MMMM [de] YYYY')}`

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
          <MonthlyTrendChart
            data={chartData}
            selectedMonthKey={selectedMonthKey}
            onMonthSelect={onMonthSelect}
          />
        )}
      </CardContent>
    </Card>
  )
}
