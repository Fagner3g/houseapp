import type { GetOrgSlugReportsTransactions200ReportsChartData } from '@/api/generated/model'
import { CategoryBreakdownChart } from '@/components/charts/category-breakdown-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  categoryBreakdown: GetOrgSlugReportsTransactions200ReportsChartData['categoryBreakdown']
  incomeByTag: GetOrgSlugReportsTransactions200ReportsChartData['incomeByTag']
  expenseByTag: GetOrgSlugReportsTransactions200ReportsChartData['expenseByTag']
}

export function TagsSummary({ categoryBreakdown, incomeByTag, expenseByTag }: Props) {
  const hasIncome = incomeByTag && incomeByTag.length > 0
  const hasExpense = expenseByTag && expenseByTag.length > 0

  return (
    <div className="px-4 lg:px-6">
      <div className="grid gap-4 md:grid-cols-2">
        {hasIncome && (
          <Card>
            <CardHeader>
              <CardTitle>Receitas por Tags</CardTitle>
              <CardDescription>Quanto foi recebido/registrado por tag neste mês</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryBreakdownChart data={incomeByTag} />
            </CardContent>
          </Card>
        )}

        {hasExpense && (
          <Card>
            <CardHeader>
              <CardTitle>Despesas por Tags</CardTitle>
              <CardDescription>Quanto foi gasto/registrado por tag neste mês</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryBreakdownChart data={expenseByTag} />
            </CardContent>
          </Card>
        )}
      </div>

      {!hasIncome && !hasExpense && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo por Tags</CardTitle>
            <CardDescription>Quanto foi gasto/registrado por tag neste mês</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownChart data={categoryBreakdown} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
