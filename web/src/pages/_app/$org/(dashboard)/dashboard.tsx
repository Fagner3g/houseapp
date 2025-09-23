import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  PieChart,
  TrendingUp,
  User,
  Users,
} from 'lucide-react'
import { useState } from 'react'

import { useGetOrgSlugReportsTransactions } from '@/api/generated/api'
import type {
  GetOrgSlugReportsTransactions200Reports,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
import { CategoryBreakdownChart } from '@/components/charts/category-breakdown-chart'
import { DailyTransactionsChart } from '@/components/charts/daily-transactions-chart'
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart'
import { StatusDistributionChart } from '@/components/charts/status-distribution-chart'
import { LoadingErrorState } from '@/components/loading-error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { DrawerTransaction } from '@/pages/_app/$org/(transactions)/-components/table-list-transactions/drawer-transaction'

interface TransactionCardProps {
  transaction: ListTransactions200TransactionsItem
  onEdit: (transaction: ListTransactions200TransactionsItem) => void
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'overdue' | 'upcoming'
}

function TransactionCard({
  transaction,
  onEdit,
  children,
  className = '',
  variant = 'default',
}: TransactionCardProps) {
  const baseClasses =
    'flex items-center justify-between p-4 border rounded-lg transition-all duration-200'

  const variantClasses = {
    default: 'hover:bg-muted/50',
    overdue:
      'border-red-200 bg-red-50/50 hover:bg-red-100/50 dark:border-red-800 dark:bg-red-950/20 dark:hover:bg-red-950/30',
    upcoming: 'hover:bg-muted/50',
  }

  // Sempre permitir clique para visualização, independente de ser o dono
  return (
    <button
      type="button"
      className={`${baseClasses} cursor-pointer w-full text-left ${variantClasses[variant]} ${className}`}
      onClick={() => onEdit(transaction)}
    >
      {children}
    </button>
  )
}

export const Route = createFileRoute('/_app/$org/(dashboard)/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const { slug } = useActiveOrganization()
  const {
    data: reports,
    isPending: isLoading,
    error,
    refetch,
  } = useGetOrgSlugReportsTransactions(slug)
  const [editingTransaction, setEditingTransaction] =
    useState<ListTransactions200TransactionsItem | null>(null)

  // Use o item original da listagem diretamente no editor

  const handleEditTransaction = (transaction: ListTransactions200TransactionsItem) => {
    setEditingTransaction(transaction)
  }

  // Tipar blocos extras retornados pelo backend (fora do OpenAPI)
  const extReports = reports?.reports as GetOrgSlugReportsTransactions200Reports & {
    overdueTransactions?: {
      summary?: { total?: number }
      transactions: ListTransactions200TransactionsItem[]
    }
    paidThisMonth?: {
      summary?: { total?: number; totalAmount?: number }
      transactions: ListTransactions200TransactionsItem[]
    }
  }

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
            {(() => {
              type Overdue = {
                summary?: { total?: number }
                transactions: ListTransactions200TransactionsItem[]
              }
              type PaidThisMonth = {
                summary?: { total?: number; totalAmount?: number }
                transactions: ListTransactions200TransactionsItem[]
              }
              // Extend server payload (extra fields not in OpenAPI)
              const ext = reports.reports as unknown as {
                overdueTransactions?: Overdue
                paidThisMonth?: PaidThisMonth
              }
              // Expose once for JSX below
              // @ts-expect-error - captured in closure
              window.__dash_ext__ = ext
              return null
            })()}
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

            {/* Transações Vencidas */}
            {(extReports?.overdueTransactions?.transactions?.length ?? 0) > 0 && (
              <div className="px-4 lg:px-6">
                <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <AlertTriangle className="h-5 w-5" />
                      Transações Vencidas
                    </CardTitle>
                    <CardDescription className="text-red-600 dark:text-red-400">
                      {extReports?.overdueTransactions?.summary?.total || 0} transação(ões)
                      vencida(s) requerem atenção
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {extReports?.overdueTransactions?.transactions?.map(
                        (transaction: ListTransactions200TransactionsItem) => {
                          return (
                            <TransactionCard
                              key={transaction.id}
                              transaction={transaction}
                              onEdit={handleEditTransaction}
                              variant="overdue"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                  <h4 className="font-medium text-foreground">
                                    {transaction.title}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>{transaction.ownerName}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span className="font-medium">
                                      R${' '}
                                      {Number(transaction.amount).toLocaleString('pt-BR', {
                                        minimumFractionDigits: 2,
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1 justify-end mb-1">
                                  <Clock className="h-3 w-3 text-red-500" />
                                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                    {transaction.overdueDays === 1
                                      ? '1 dia vencido'
                                      : `${transaction.overdueDays} dias vencidos`}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Venceu em{' '}
                                  {new Date(transaction.dueDate).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </TransactionCard>
                          )
                        }
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

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
                      {reports.reports.upcomingAlerts.transactions.map(transaction => {
                        const normalized = {
                          id: transaction.id,
                          serieId: transaction.id,
                          type: 'expense',
                          title: transaction.title,
                          payTo: transaction.payToName ?? '',
                          ownerId: '',
                          payToId: '',
                          ownerName: transaction.ownerName,
                          amount: String(transaction.amount),
                          dueDate: transaction.dueDate,
                          paidAt: null,
                          status: 'pending',
                          overdueDays: 0,
                          tags: [],
                          installmentsTotal: null,
                          installmentsPaid: null,
                          description: null,
                        } as ListTransactions200TransactionsItem
                        return (
                          <TransactionCard
                            key={transaction.id}
                            transaction={normalized}
                            onEdit={handleEditTransaction}
                            variant="upcoming"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <h4 className="font-medium text-foreground">{transaction.title}</h4>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{transaction.ownerName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  <span className="font-medium">
                                    R${' '}
                                    {transaction.amount.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 justify-end mb-1">
                                <Clock
                                  className={`h-3 w-3 ${
                                    transaction.alertType === 'urgent'
                                      ? 'text-red-500'
                                      : transaction.alertType === 'warning'
                                        ? 'text-orange-500'
                                        : 'text-blue-500'
                                  }`}
                                />
                                <span
                                  className={`text-sm font-medium ${
                                    transaction.alertType === 'urgent'
                                      ? 'text-red-600 dark:text-red-400'
                                      : transaction.alertType === 'warning'
                                        ? 'text-orange-600 dark:text-orange-400'
                                        : 'text-blue-600 dark:text-blue-400'
                                  }`}
                                >
                                  {transaction.daysUntilDue === 0
                                    ? 'Vence hoje'
                                    : transaction.daysUntilDue === 1
                                      ? 'Vence amanhã'
                                      : `Vence em ${transaction.daysUntilDue} dias`}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Vence em {new Date(transaction.dueDate).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </TransactionCard>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma transação próxima do vencimento
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Pagas neste mês */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pagas neste mês
                  </CardTitle>
                  <CardDescription>
                    {extReports?.paidThisMonth?.summary?.total || 0} transações • R${' '}
                    {(extReports?.paidThisMonth?.summary?.totalAmount || 0).toLocaleString(
                      'pt-BR',
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(extReports?.paidThisMonth?.transactions || []).length > 0 ? (
                    <div className="space-y-3">
                      {(extReports?.paidThisMonth?.transactions || []).map(transaction => {
                        return (
                          <TransactionCard
                            key={transaction.id}
                            transaction={transaction}
                            onEdit={handleEditTransaction}
                            variant="default"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                                <h4 className="font-medium text-foreground">{transaction.title}</h4>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{transaction.ownerName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  <span className="font-medium">
                                    R${' '}
                                    {Number(transaction.amount).toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                Pago em{' '}
                                {new Date(
                                  transaction.paidAt ?? transaction.dueDate
                                ).toLocaleDateString('pt-BR')}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Vencimento{' '}
                                {new Date(transaction.dueDate).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </TransactionCard>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma transação paga neste mês
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

      {/* Drawer de Edição */}
      <DrawerTransaction
        transaction={editingTransaction}
        open={!!editingTransaction}
        onOpenChange={open => {
          if (!open) setEditingTransaction(null)
        }}
      />
    </LoadingErrorState>
  )
}
