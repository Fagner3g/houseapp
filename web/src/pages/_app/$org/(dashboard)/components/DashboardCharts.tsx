import { BarChart3, PieChart, TrendingUp } from 'lucide-react'

import type { GetOrgSlugReportsTransactions200ReportsChartData } from '@/api/generated/model'
import { CategoryBreakdownChart } from '@/components/charts/category-breakdown-chart'
import { DailyTransactionsChart } from '@/components/charts/daily-transactions-chart'
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart'
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
            <CardDescription>Valores por dia do mês atual</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyTransactionsChart data={data.dailyTransactions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tendência Mensal
            </CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart data={data.monthlyTrend} />
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Categorias
            </CardTitle>
            <CardDescription>Valores por categoria do mês</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownChart data={data.categoryBreakdown} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
