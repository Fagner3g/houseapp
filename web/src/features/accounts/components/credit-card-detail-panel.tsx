import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import { CreditCardSettingsSection } from '@/features/credit-cards/components/credit-card-settings-section'
import type { InvoiceQuickFilter } from '@/features/credit-cards/components/credit-card-statement-filter-utils'
import { useCreditCardBillingCycle } from '@/features/credit-cards/hooks/use-credit-card-billing-cycle'
import { canNavigateToNextBillingMonth } from '@/features/credit-cards/lib/navigable-billing-month'
import {
  AccountsHubSubNav,
  type AccountsHubView,
} from '@/features/accounts/components/accounts-hub-sub-nav'
import { CreditCardPeriodViews } from '@/features/accounts/components/credit-card-period-views'

interface CreditCardDetailPanelProps {
  account: ListAccounts200AccountsItem
  billingMonthKey: string
  view: AccountsHubView
  invoiceFilter?: InvoiceQuickFilter
  onViewChange: (view: AccountsHubView) => void
  onMonthChange: (monthKey: string) => void
  onInvoiceFilterChange: (filter: InvoiceQuickFilter | undefined) => void
  onUpdated: () => void
  onImported: () => void
  onViewExistingStatement: (args: { accountId: string; monthKey: string }) => void
}

export function CreditCardDetailPanel({
  account,
  billingMonthKey,
  view,
  invoiceFilter,
  onViewChange,
  onMonthChange,
  onInvoiceFilterChange,
  onUpdated,
  onImported,
  onViewExistingStatement,
}: CreditCardDetailPanelProps) {
  const isSettings = view === 'settings'
  const isAnalytics = view === 'analytics'
  const isStatement = !isSettings && !isAnalytics

  const { cycle, closingDay, dueDay, latestNavigableMonthKey } = useCreditCardBillingCycle(
    account,
    billingMonthKey
  )
  const canGoNextMonth = canNavigateToNextBillingMonth(
    billingMonthKey,
    latestNavigableMonthKey
  )

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-24 md:pb-6">
      <AccountsHubSubNav kind="cards" view={view} onViewChange={onViewChange} />

      {isSettings ? (
        <CreditCardSettingsSection
          account={account}
          onBack={() => onViewChange('statement')}
          onUpdated={onUpdated}
          onViewStatement={onViewExistingStatement}
        />
      ) : (
        <CreditCardPeriodViews
          account={account}
          cycle={cycle}
          closingDay={closingDay}
          dueDay={dueDay}
          billingMonthKey={billingMonthKey}
          canGoNextMonth={canGoNextMonth}
          isStatement={isStatement}
          invoiceFilter={invoiceFilter}
          onMonthChange={onMonthChange}
          onInvoiceFilterChange={onInvoiceFilterChange}
          onImported={onImported}
          onViewExistingStatement={onViewExistingStatement}
        />
      )}
    </div>
  )
}
