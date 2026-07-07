import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'

import {
  getListAccountsQueryKey,
  useDeleteAccount,
  useListAccounts,
} from '@/api/generated/api'
import type { CreateAccountBodyType, ListAccounts200AccountsItem } from '@/api/generated/model'
import { LoadingErrorState } from '@/components/loading-error-state'
import { Button } from '@/components/ui/button'
import { AccountTypeSidebar } from '@/features/accounts/components/account-type-sidebar'
import { ImportStatementDialog } from '@/features/accounts/components/import-statement-dialog'
import { groupCreditCardsForSidebar } from '@/features/accounts/constants'
import { DeleteCreditCardDialog } from '@/features/credit-cards/components/delete-credit-card-dialog'
import { CreditCardAnalyticsSection } from '@/features/credit-cards/components/credit-card-analytics-section'
import { CreditCardKpiRow } from '@/features/credit-cards/components/credit-card-kpi-row'
import { CreditCardOverdueBanner } from '@/features/credit-cards/components/credit-card-overdue-banner'
import { CreditCardPageHeader } from '@/features/credit-cards/components/credit-card-page-header'
import { CreditCardSettingsSection } from '@/features/credit-cards/components/credit-card-settings-section'
import { CreditCardStatementSection } from '@/features/credit-cards/components/credit-card-statement-section'
import type { InvoiceQuickFilter } from '@/features/credit-cards/components/credit-card-statement-filter-utils'
import { useCreditCardBillingCycle } from '@/features/credit-cards/hooks/use-credit-card-billing-cycle'
import {
  CreditCardSubNav,
  type CreditCardView,
} from '@/features/credit-cards/components/credit-card-sub-nav'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import {
  currentBillingMonthKey,
  shiftBillingMonth,
} from '@/lib/billing-cycle'
import { useDrawerStore } from '@/stores/drawers'

export const Route = createFileRoute('/_app/$org/accounts/')({
  component: AccountsPage,
  validateSearch: z.object({
    accountId: z.string().optional(),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
    view: z.enum(['settings', 'analytics']).optional(),
    invoiceFilter: z
      .enum(['all', 'purchases', 'payments', 'uncategorized', 'installments', 'divided'])
      .optional(),
  }),
})

function AccountsPage() {
  const { slug } = useActiveOrganization()
  const navigate = useNavigate({ from: Route.fullPath })
  const { accountId, month, view, invoiceFilter } = Route.useSearch()
  const isSettingsView = view === 'settings'
  const isAnalyticsView = view === 'analytics'
  const isStatementView = !isSettingsView && !isAnalyticsView
  const currentView: CreditCardView = isSettingsView
    ? 'settings'
    : isAnalyticsView
      ? 'analytics'
      : 'statement'
  const queryClient = useQueryClient()
  const openAccountDrawer = useDrawerStore(s => s.openAccountDrawer)

  const { data, isLoading, error, refetch } = useListAccounts(slug, {
    query: { enabled: !!slug, placeholderData: keepPreviousData },
  })
  const { mutateAsync: deleteAccount, isPending: isDeletingAccount } = useDeleteAccount()
  const [accountToDelete, setAccountToDelete] = useState<ListAccounts200AccountsItem | null>(null)
  const [onboardingImportOpen, setOnboardingImportOpen] = useState(false)

  const accounts = useMemo(() => data?.accounts ?? [], [data?.accounts])
  const creditCards = useMemo(
    () => accounts.filter(account => account.type === 'credit_card'),
    [accounts]
  )

  const sections = useMemo(() => groupCreditCardsForSidebar(accounts), [accounts])

  const selectedId = accountId ?? creditCards[0]?.id
  const selectedAccount = creditCards.find(a => a.id === selectedId)
  const billingMonthKey = month ?? currentBillingMonthKey()

  const { cycle, closingDay, dueDay } = useCreditCardBillingCycle(
    selectedAccount,
    billingMonthKey
  )

  useEffect(() => {
    if (!creditCards.length) return

    const isValidSelection = accountId && creditCards.some(card => card.id === accountId)
    if (!isValidSelection) {
      navigate({
        search: prev => ({
          ...prev,
          accountId: creditCards[0].id,
          month: prev.month ?? currentBillingMonthKey(),
        }),
        replace: true,
      })
    }
  }, [creditCards, accountId, navigate])

  const invalidateAccounts = () => {
    queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(slug) })
  }

  const updateSearch = (patch: {
    accountId?: string
    month?: string
    view?: 'settings' | 'analytics' | undefined
    invoiceFilter?: InvoiceQuickFilter | undefined
  }) => {
    navigate({
      search: prev => ({ ...prev, ...patch }),
      replace: true,
    })
  }

  const handleViewChange = (nextView: CreditCardView) => {
    updateSearch({
      view: nextView === 'statement' ? undefined : nextView,
    })
  }

  const handleCreate = (type: CreateAccountBodyType, institution?: string | null) => {
    openAccountDrawer(newId => {
      invalidateAccounts()
      updateSearch({ accountId: newId, month: currentBillingMonthKey() })
    }, type, institution)
  }

  const handleOpenSettings = (account: ListAccounts200AccountsItem) => {
    updateSearch({ accountId: account.id, view: 'settings' })
  }

  const handleDelete = (account: ListAccounts200AccountsItem) => {
    setAccountToDelete(account)
  }

  const confirmDelete = async () => {
    if (!slug || !accountToDelete) return

    try {
      await deleteAccount({ slug, id: accountToDelete.id })
      invalidateAccounts()
      if (accountToDelete.id === selectedId) {
        const remaining = creditCards.filter(a => a.id !== accountToDelete.id)
        updateSearch({ accountId: remaining[0]?.id, view: undefined })
      }
      toast.success('Cartão excluído')
      setAccountToDelete(null)
    } catch {
      toast.error('Erro ao excluir cartão')
    }
  }

  const handleImported = () => {
    refetch()
    invalidateAccounts()
  }

  const handleViewExistingStatement = ({
    accountId,
    monthKey,
  }: {
    accountId: string
    monthKey: string
  }) => {
    updateSearch({ accountId, month: monthKey, view: undefined })
  }

  return (
    <LoadingErrorState
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      title="Erro ao carregar cartões"
      description="Não foi possível carregar os cartões."
    >
      <div className="flex min-h-0 flex-col">
        {!creditCards.length ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
            <p className="text-slate-500">Nenhum cartão cadastrado.</p>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Importe uma fatura OFX do Nubank para cadastrar o cartão e começar a acompanhar seus
              gastos.
            </p>
            <div className="mt-6">
              <Button className="bg-slate-900" onClick={() => setOnboardingImportOpen(true)}>
                <Upload className="mr-2 size-4" />
                Importar fatura
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:min-h-[calc(100vh-8rem)] lg:flex-row">
            <AccountTypeSidebar
              sections={sections}
              selectedId={selectedId}
              onSelect={id => updateSearch({ accountId: id, view: undefined })}
              onCreate={handleCreate}
              onOpenSettings={handleOpenSettings}
              onDelete={handleDelete}
            />

            {selectedAccount && (
              <div className="min-w-0 flex-1 pb-24 md:pb-6">
                <CreditCardSubNav view={currentView} onViewChange={handleViewChange} />

                {isSettingsView ? (
                  <CreditCardSettingsSection
                    account={selectedAccount}
                    onBack={() => updateSearch({ view: undefined })}
                    onUpdated={invalidateAccounts}
                    onViewStatement={handleViewExistingStatement}
                  />
                ) : (
                  <>
                    <CreditCardPageHeader
                      accountId={selectedAccount.id}
                      cycle={cycle}
                      closingDay={closingDay}
                      dueDay={dueDay}
                      isCurrentCycle={billingMonthKey === currentBillingMonthKey()}
                      onPrevMonth={() =>
                        updateSearch({ month: shiftBillingMonth(billingMonthKey, -1) })
                      }
                      onNextMonth={() =>
                        updateSearch({ month: shiftBillingMonth(billingMonthKey, 1) })
                      }
                      onGoToday={() => updateSearch({ month: currentBillingMonthKey() })}
                      onNavigateToMonth={monthKey => updateSearch({ month: monthKey })}
                    />

                    {isStatementView ? (
                      <div className="space-y-4 py-3">
                        <CreditCardOverdueBanner
                          accountId={selectedAccount.id}
                          cycle={cycle}
                          closingDay={closingDay}
                          dueDay={dueDay}
                          viewingMonthKey={billingMonthKey}
                          onNavigateToMonth={monthKey => updateSearch({ month: monthKey })}
                        />
                        <CreditCardKpiRow
                          accountId={selectedAccount.id}
                          accountName={selectedAccount.name}
                          cycle={cycle}
                          closingDay={closingDay}
                          dueDay={dueDay}
                        />
                        <CreditCardStatementSection
                          accountId={selectedAccount.id}
                          cycle={cycle}
                          closingDay={closingDay}
                          dueDay={dueDay}
                          initialQuickFilter={invoiceFilter}
                          onImported={handleImported}
                          onViewExistingStatement={handleViewExistingStatement}
                        />
                      </div>
                    ) : (
                      <CreditCardAnalyticsSection
                        accountId={selectedAccount.id}
                        accountName={selectedAccount.name}
                        cycle={cycle}
                        closingDay={closingDay}
                        dueDay={dueDay}
                        onNavigateToMonth={monthKey => updateSearch({ month: monthKey })}
                        onViewDividedTransactions={() =>
                          updateSearch({ view: undefined, invoiceFilter: 'divided' })
                        }
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteCreditCardDialog
        account={accountToDelete}
        open={accountToDelete != null}
        onOpenChange={open => {
          if (!open && !isDeletingAccount) setAccountToDelete(null)
        }}
        onConfirm={confirmDelete}
        isDeleting={isDeletingAccount}
      />

      <ImportStatementDialog
        open={onboardingImportOpen}
        onOpenChange={setOnboardingImportOpen}
        showTrigger={false}
        onImported={importedAccountId => {
          invalidateAccounts()
          updateSearch({
            accountId: importedAccountId,
            month: currentBillingMonthKey(),
          })
        }}
        onViewExistingStatement={handleViewExistingStatement}
      />
    </LoadingErrorState>
  )
}
