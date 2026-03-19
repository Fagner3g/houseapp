import { PieChart, TrendingUp } from 'lucide-react'

import type { GetOrgSlugReportsTransactions200ReportsChartData } from '@/api/generated/model'
import { DailyTransactionsChart } from '@/components/charts/daily-transactions-chart'
import { StatusDistributionChart } from '@/components/charts/status-distribution-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = { data: GetOrgSlugReportsTransactions200ReportsChartData }

export function DashboardCharts({ data }: Props) {
  return (
    <div className="px-4 lg:px-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Transações Diárias
            </CardTitle>
            <CardDescription>Valores por dia do mês selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyTransactionsChart data={data.dailyTransactions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribuição por Status
            </CardTitle>
            <CardDescription>Status das transações do mês</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDistributionChart data={data.statusDistribution} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
