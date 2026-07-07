import type { GetReportDaily200 } from '@/api/generated/model'
import { DailyTransactionsChart } from '@/components/charts/daily-transactions-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { mapDailyToChartData } from '../lib/chart-mappers'

interface DailyFlowCardProps {
  data?: GetReportDaily200
  isLoading?: boolean
  error?: unknown
}

export function DailyFlowCard({ data, isLoading, error }: DailyFlowCardProps) {
  const chartData = data ? mapDailyToChartData(data.days) : []

  return (
    <Card className="finance-card">
      <CardHeader>
        <CardTitle className="text-base">Fluxo diário do mês</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-80 items-center justify-center text-sm text-slate-500">
            Carregando gráfico...
          </div>
        ) : error ? (
          <div className="flex h-80 items-center justify-center text-sm text-slate-500">
            Não foi possível carregar o fluxo diário
          </div>
        ) : chartData.every(d => d.income === 0 && d.expense === 0) ? (
          <div className="flex h-80 items-center justify-center text-sm text-slate-500">
            Nenhum lançamento pago neste período
          </div>
        ) : (
          <DailyTransactionsChart data={chartData} />
        )}
      </CardContent>
    </Card>
  )
}
