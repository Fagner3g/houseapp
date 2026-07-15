import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import { AccountAnalyticsSection } from '@/features/accounts/components/account-analytics-section'
import { AccountKpiRow } from '@/features/accounts/components/account-kpi-row'
import { AccountPageHeader } from '@/features/accounts/components/account-page-header'
import { AccountSettingsSection } from '@/features/accounts/components/account-settings-section'
import { AccountStatementSection } from '@/features/accounts/components/account-statement-section'
import {
  AccountsHubSubNav,
  type AccountsHubView,
} from '@/features/accounts/components/accounts-hub-sub-nav'
import { currentMonthKey, monthKeyToRange, shiftMonth } from '@/lib/date-range'

interface AccountDetailPanelProps {
  account: ListAccounts200AccountsItem
  monthKey: string
  view: AccountsHubView
  onViewChange: (view: AccountsHubView) => void
  onMonthChange: (monthKey: string) => void
  onUpdated: () => void
}

export function AccountDetailPanel({
  account,
  monthKey,
  view,
  onViewChange,
  onMonthChange,
  onUpdated,
}: AccountDetailPanelProps) {
  const canManage = account.canManage !== false
  const isSettings = canManage && view === 'settings'
  const isAnalytics = view === 'analytics'
  const { dateFrom, dateTo, label } = monthKeyToRange(monthKey)
  const monthLabel = label.charAt(0).toUpperCase() + label.slice(1)

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-24 md:pb-6">
      <AccountsHubSubNav
        kind="accounts"
        view={isSettings ? 'settings' : isAnalytics ? 'analytics' : 'statement'}
        onViewChange={onViewChange}
        showSettings={canManage}
      />

      {isSettings ? (
        <AccountSettingsSection
          account={account}
          onBack={() => onViewChange('statement')}
          onUpdated={onUpdated}
        />
      ) : (
        <>
          <AccountPageHeader
            monthLabel={monthLabel}
            onPrevMonth={() => onMonthChange(shiftMonth(monthKey, -1))}
            onNextMonth={() => {
              const next = shiftMonth(monthKey, 1)
              if (next <= currentMonthKey()) onMonthChange(next)
            }}
          />

          {isAnalytics ? (
            <AccountAnalyticsSection
              accountId={account.id}
              accountName={account.name}
              monthKey={monthKey}
            />
          ) : (
            <div className="space-y-4 py-3">
              <AccountKpiRow
                accountId={account.id}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
              <AccountStatementSection
                accountId={account.id}
                accountType={account.type}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
