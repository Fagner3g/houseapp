import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import type { InvoiceQuickFilter } from '@/features/credit-cards/components/credit-card-statement-filter-utils'
import { CreditCardAnalyticsSection } from '@/features/credit-cards/components/credit-card-analytics-section'
import { CreditCardKpiRow } from '@/features/credit-cards/components/credit-card-kpi-row'
import { CreditCardOverdueBanner } from '@/features/credit-cards/components/credit-card-overdue-banner'
import { CreditCardPageHeader } from '@/features/credit-cards/components/credit-card-page-header'
import { CreditCardStatementSection } from '@/features/credit-cards/components/credit-card-statement-section'
import {
  currentBillingMonthKey,
  shiftBillingMonth,
  type BillingCycle,
} from '@/lib/billing-cycle'

interface CreditCardPeriodViewsProps {
  account: ListAccounts200AccountsItem
  cycle: BillingCycle
  closingDay: number
  dueDay: number
  billingMonthKey: string
  canGoNextMonth: boolean
  isStatement: boolean
  invoiceFilter?: InvoiceQuickFilter
  onMonthChange: (monthKey: string) => void
  onInvoiceFilterChange: (filter: InvoiceQuickFilter | undefined) => void
  onImported: () => void
  onViewExistingStatement: (args: { accountId: string; monthKey: string }) => void
}

export function CreditCardPeriodViews({
  account,
  cycle,
  closingDay,
  dueDay,
  billingMonthKey,
  canGoNextMonth,
  isStatement,
  invoiceFilter,
  onMonthChange,
  onInvoiceFilterChange,
  onImported,
  onViewExistingStatement,
}: CreditCardPeriodViewsProps) {
  return (
    <>
      <CreditCardPageHeader
        accountId={account.id}
        cycle={cycle}
        closingDay={closingDay}
        dueDay={dueDay}
        isCurrentCycle={billingMonthKey === currentBillingMonthKey()}
        canGoNextMonth={canGoNextMonth}
        onPrevMonth={() => onMonthChange(shiftBillingMonth(billingMonthKey, -1))}
        onNextMonth={() => onMonthChange(shiftBillingMonth(billingMonthKey, 1))}
        onGoToday={() => onMonthChange(currentBillingMonthKey())}
        onNavigateToMonth={onMonthChange}
      />

      {isStatement ? (
        <div className="space-y-4 py-3">
          <CreditCardOverdueBanner
            accountId={account.id}
            cycle={cycle}
            closingDay={closingDay}
            dueDay={dueDay}
            viewingMonthKey={billingMonthKey}
            onNavigateToMonth={onMonthChange}
          />
          <CreditCardKpiRow
            accountId={account.id}
            accountName={account.name}
            cycle={cycle}
            closingDay={closingDay}
            dueDay={dueDay}
            onViewAReceber={() => onInvoiceFilterChange('a_receber')}
          />
          <CreditCardStatementSection
            accountId={account.id}
            cycle={cycle}
            closingDay={closingDay}
            dueDay={dueDay}
            initialQuickFilter={invoiceFilter}
            onImported={onImported}
            onViewExistingStatement={onViewExistingStatement}
          />
        </div>
      ) : (
        <CreditCardAnalyticsSection
          accountId={account.id}
          accountName={account.name}
          cycle={cycle}
          closingDay={closingDay}
          dueDay={dueDay}
          onNavigateToMonth={onMonthChange}
          onViewDividedTransactions={() => onInvoiceFilterChange('divided')}
          onViewInvoiceCredits={() => onInvoiceFilterChange('credits')}
          onViewInvoicePayments={() => onInvoiceFilterChange('payments')}
        />
      )}
    </>
  )
}
