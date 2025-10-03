import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import {
  getGetOrgSlugReportsTransactionsQueryKey,
  getGetOrgSlugReportsTransactionsQueryOptions,
  getGetTransactionByIdQueryKey,
  getGetTransactionInstallmentsQueryKey,
  getListTransactionsQueryKey,
  useUpdateTransaction,
} from '@/api/generated/api'
import type {
  GetOrgSlugReportsTransactions200,
  GetOrgSlugReportsTransactions200ReportsCounterparties,
  ListTransactions200TransactionsItem,
  UpdateTransactionBody,
} from '@/api/generated/model'
import { DrawerTransaction } from '@/components/drawer-transaction'
import { LoadingErrorState } from '@/components/loading-error-state'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useAuthStore } from '@/stores/auth'
import { CounterpartySummary } from './components/CounterpartySummary'
import { DashboardCharts } from './components/DashboardCharts'
import { MonthlyStatsCards } from './components/MonthlyStatsCards'
import { OverdueTransactionsCard } from './components/OverdueTransactionsCard'
import { PaidThisMonthCard } from './components/PaidThisMonthCard'
import { ReceivedVsToPay } from './components/ReceivedVsToPay'
import { RecentActivity } from './components/RecentActivity'
import { TopBillsSummary } from './components/TopBillsSummary'
import { UpcomingAlerts } from './components/UpcomingAlerts'

interface HandleonExternalSubmitProps {
  id: string
  data: UpdateTransactionBody
}

export const Route = createFileRoute('/_app/$org/(dashboard)/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const { slug } = useActiveOrganization()
  const currentUser = useAuthStore(s => s.user)
  const {
    data: reports,
    isLoading,
    error,
    refetch,
  } = useQuery<GetOrgSlugReportsTransactions200>(getGetOrgSlugReportsTransactionsQueryOptions(slug))
  const [editingTransaction, setEditingTransaction] =
    useState<ListTransactions200TransactionsItem | null>(null)
  const queryClient = useQueryClient()
  const [editorVersion, setEditorVersion] = useState(0)

  const { mutateAsync: updateTransaction } = useUpdateTransaction()

  const handleEditTransaction = async (transaction: ListTransactions200TransactionsItem) => {
    const ensuredOwner: ListTransactions200TransactionsItem = {
      ...transaction,
      ownerId: transaction.ownerId || (currentUser?.id as string),
      status: transaction.status || 'pending',
    }

    setEditingTransaction(ensuredOwner)
    setEditorVersion(v => v + 1)
  }

  const handleonExternalSubmit = async ({ id, data }: HandleonExternalSubmitProps) => {
    if (!slug || !id) return
    await updateTransaction({ slug, id, data })
    // Invalidate: reports, specific transaction, and list
    queryClient.invalidateQueries({
      queryKey: getGetOrgSlugReportsTransactionsQueryKey(slug),
    })

    // Invalidate installments for this series to refresh timeline
    queryClient.invalidateQueries({ queryKey: getGetTransactionByIdQueryKey(slug, id) })

    const serieId = editingTransaction?.serieId
    if (serieId) {
      queryClient.invalidateQueries({
        queryKey: getGetTransactionInstallmentsQueryKey(slug, serieId),
      })
    }
    queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(slug) })
    setEditingTransaction(null)
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
            <TopBillsSummary kpis={reports.reports.kpis} />
            <MonthlyStatsCards stats={reports.reports.monthlyStats} />
            <CounterpartySummary
              data={
                reports.reports
                  .counterparties as unknown as GetOrgSlugReportsTransactions200ReportsCounterparties
              }
            />

            <OverdueTransactionsCard
              data={reports.reports.overdueTransactions}
              onEdit={handleEditTransaction}
            />

            <UpcomingAlerts
              upcoming={reports.reports.upcomingAlerts}
              onEdit={handleEditTransaction}
            />

            <PaidThisMonthCard
              data={reports.reports.paidThisMonth}
              onEdit={handleEditTransaction}
            />

            <ReceivedVsToPay kpis={reports.reports.kpis} />

            <DashboardCharts data={reports.reports.chartData} />

            <RecentActivity items={reports.reports.recentActivity} />
          </>
        )}
      </div>

      {editingTransaction && (
        <DrawerTransaction
          key={`${editingTransaction.id}:${editorVersion}`}
          transaction={editingTransaction}
          open={true}
          onOpenChange={open => {
            if (!open) setEditingTransaction(null)
          }}
          onExternalSubmit={handleonExternalSubmit}
        />
      )}
    </LoadingErrorState>
  )
}
