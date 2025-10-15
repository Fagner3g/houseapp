import type { GetOrgSlugReportsTransactions200ReportsChartData } from '@/api/generated/model'
import { CategoryBreakdownChart } from '@/components/charts/category-breakdown-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  data: GetOrgSlugReportsTransactions200ReportsChartData['categoryBreakdown']
}

export function TagsSummary({ data }: Props) {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Tags</CardTitle>
          <CardDescription>Quanto foi gasto/registrado por tag neste mês</CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryBreakdownChart data={data} />
        </CardContent>
      </Card>
    </div>
  )
}
