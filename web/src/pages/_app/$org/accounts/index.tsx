import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'

import { LoadingErrorState } from '@/components/loading-error-state'
import { AccountDetailPanel } from '@/features/accounts/components/account-detail-panel'
import { AccountsHubEmptyState } from '@/features/accounts/components/accounts-hub-empty-state'
import { AccountTypeSidebar } from '@/features/accounts/components/account-type-sidebar'
import { CreditCardDetailPanel } from '@/features/accounts/components/credit-card-detail-panel'
import { DeleteAccountDialog } from '@/features/accounts/components/delete-account-dialog'
import { useAccountsHub } from '@/features/accounts/hooks/use-accounts-hub'
import { currentBillingMonthKey } from '@/lib/billing-cycle'

export const Route = createFileRoute('/_app/$org/accounts/')({
  component: AccountsPage,
  validateSearch: z.object({
    kind: z.enum(['cards', 'accounts']).optional(),
    accountId: z.string().optional(),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
    view: z.enum(['settings', 'analytics']).optional(),
    invoiceFilter: z
      .enum([
        'all',
        'purchases',
        'payments',
        'credits',
        'uncategorized',
        'installments',
        'divided',
        'a_receber',
      ])
      .optional(),
  }),
})

function AccountsPage() {
  const search = Route.useSearch()
  const hub = useAccountsHub(search)
  const isCards = hub.kind === 'cards'
  const listEmpty = isCards ? !hub.creditCards.length : !hub.paymentAccounts.length

  return (
    <LoadingErrorState
      isLoading={hub.isLoading}
      error={hub.error}
      onRetry={hub.refetch}
      title={isCards ? 'Erro ao carregar cartões' : 'Erro ao carregar contas'}
      description={
        isCards
          ? 'Não foi possível carregar os cartões.'
          : 'Não foi possível carregar as contas.'
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <AccountTypeSidebar
            kind={hub.kind}
            onKindChange={hub.handleKindChange}
            sections={hub.sections}
            selectedId={hub.selectedId}
            onSelect={id =>
              hub.updateSearch({ accountId: id, view: undefined, invoiceFilter: undefined })
            }
            onCreate={hub.handleCreate}
            onOpenSettings={hub.handleOpenSettings}
            onDelete={hub.setAccountToDelete}
          />

          {listEmpty ? (
            <AccountsHubEmptyState
              kind={hub.kind}
              onCreate={() => hub.handleCreate(isCards ? 'credit_card' : 'checking')}
              onImported={importedAccountId => {
                hub.invalidateAccounts()
                hub.updateSearch({
                  kind: 'cards',
                  accountId: importedAccountId,
                  month: currentBillingMonthKey(),
                })
              }}
              onViewExistingStatement={hub.handleViewExistingStatement}
            />
          ) : hub.selectedAccount && isCards ? (
            <CreditCardDetailPanel
              account={hub.selectedAccount}
              billingMonthKey={hub.monthKey}
              view={hub.currentView}
              invoiceFilter={hub.invoiceFilter}
              onViewChange={hub.handleViewChange}
              onMonthChange={monthKey => hub.updateSearch({ month: monthKey })}
              onInvoiceFilterChange={filter =>
                hub.updateSearch({ view: undefined, invoiceFilter: filter })
              }
              onUpdated={hub.invalidateAccounts}
              onImported={hub.handleImported}
              onViewExistingStatement={hub.handleViewExistingStatement}
            />
          ) : hub.selectedAccount ? (
            <AccountDetailPanel
              account={hub.selectedAccount}
              monthKey={hub.monthKey}
              view={hub.currentView}
              onViewChange={hub.handleViewChange}
              onMonthChange={monthKey => hub.updateSearch({ month: monthKey })}
              onUpdated={hub.invalidateAccounts}
            />
          ) : null}
        </div>

        <DeleteAccountDialog
          account={hub.accountToDelete}
          open={hub.accountToDelete != null}
          onOpenChange={open => {
            if (!open && !hub.isDeletingAccount) hub.setAccountToDelete(null)
          }}
          onConfirm={hub.confirmDelete}
          isDeleting={hub.isDeletingAccount}
        />
      </div>
    </LoadingErrorState>
  )
}
