import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  DollarSign,
  PieChart,
  TrendingUp,
  Users,
} from 'lucide-react'

import { useGetReportsTransactions } from '@/api/generated/api'
import { CategoryBreakdownChart } from '@/components/charts/category-breakdown-chart'
import { DailyTransactionsChart } from '@/components/charts/daily-transactions-chart'
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart'
import { StatusDistributionChart } from '@/components/charts/status-distribution-chart'
import { LoadingErrorState } from '@/components/loading-error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_app/$org/(dashboard)/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: reports, isPending: isLoading, error, refetch } = useGetReportsTransactions()

  return (
    <LoadingErrorState
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      title="Erro ao carregar relatórios"
      description="Não foi possível carregar os dados do dashboard. Tente novamente."
    >
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral das transações e alertas do sistema</p>
        </div>

        {reports && (
          <>
            {/* Cards de Estatísticas Mensais */}
            <div className="px-4 lg:px-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Transações</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reports.reports.monthlyStats.totalTransactions}
                    </div>
                    <p className="text-xs text-muted-foreground">Este mês</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R${' '}
                      {reports.reports.monthlyStats.totalAmount.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">Este mês</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Transações Pagas</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reports.reports.monthlyStats.paidTransactions}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {reports.reports.monthlyStats.totalTransactions > 0
                        ? `${((reports.reports.monthlyStats.paidTransactions / reports.reports.monthlyStats.totalTransactions) * 100).toFixed(1)}% do total`
                        : '0% do total'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Transações Vencidas</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {reports.reports.monthlyStats.overdueTransactions}
                    </div>
                    <p className="text-xs text-muted-foreground">Requerem atenção</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Alertas Próximos */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Alertas Próximos
                  </CardTitle>
                  <CardDescription>Transações que vencem nos próximos 4 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {reports.reports.upcomingAlerts.summary.today}
                      </div>
                      <p className="text-sm text-muted-foreground">Hoje</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {reports.reports.upcomingAlerts.summary.tomorrow}
                      </div>
                      <p className="text-sm text-muted-foreground">Amanhã</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {reports.reports.upcomingAlerts.summary.twoDays}
                      </div>
                      <p className="text-sm text-muted-foreground">Em 2 dias</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {reports.reports.upcomingAlerts.summary.threeToFourDays}
                      </div>
                      <p className="text-sm text-muted-foreground">Em 3-4 dias</p>
                    </div>
                  </div>

                  {reports.reports.upcomingAlerts.transactions.length > 0 ? (
                    <div className="space-y-3">
                      {reports.reports.upcomingAlerts.transactions.map(transaction => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium">{transaction.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {transaction.ownerName} • R${' '}
                              {transaction.amount.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-sm font-medium ${
                                transaction.alertType === 'urgent'
                                  ? 'text-red-600'
                                  : transaction.alertType === 'warning'
                                    ? 'text-yellow-600'
                                    : 'text-blue-600'
                              }`}
                            >
                              {transaction.daysUntilDue === 0
                                ? 'Hoje'
                                : transaction.daysUntilDue === 1
                                  ? 'Amanhã'
                                  : `Em ${transaction.daysUntilDue} dias`}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.dueDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma transação próxima do vencimento
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="px-4 lg:px-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Gráfico de Transações Diárias */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Transações Diárias
                    </CardTitle>
                    <CardDescription>Valores por dia do mês atual</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DailyTransactionsChart data={reports.reports.chartData.dailyTransactions} />
                  </CardContent>
                </Card>

                {/* Gráfico de Tendência Mensal */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Tendência Mensal
                    </CardTitle>
                    <CardDescription>Últimos 6 meses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MonthlyTrendChart data={reports.reports.chartData.monthlyTrend} />
                  </CardContent>
                </Card>

                {/* Gráfico de Distribuição por Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Distribuição por Status
                    </CardTitle>
                    <CardDescription>Status das transações do mês</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StatusDistributionChart data={reports.reports.chartData.statusDistribution} />
                  </CardContent>
                </Card>

                {/* Gráfico de Categorias */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Categorias
                    </CardTitle>
                    <CardDescription>Valores por categoria do mês</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CategoryBreakdownChart data={reports.reports.chartData.categoryBreakdown} />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Atividade Recente */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader>
                  <CardTitle>Atividade Recente</CardTitle>
                  <CardDescription>Últimas transações atualizadas</CardDescription>
                </CardHeader>
                <CardContent>
                  {reports.reports.recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {reports.reports.recentActivity.map(activity => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium">{activity.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {activity.ownerName} •{' '}
                              {new Date(activity.dueDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              R${' '}
                              {activity.amount.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                            <div
                              className={`text-xs ${
                                activity.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                              }`}
                            >
                              {activity.status === 'paid' ? 'Pago' : 'Pendente'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma atividade recente
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </LoadingErrorState>
  )
}
