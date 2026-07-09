import { AlertCircle, CircleMinus, CirclePlus, Clock, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useTransactionKpiRow } from '@/features/transactions/hooks/use-transaction-kpi-row'
import type { TransactionKpiCard } from '@/features/transactions/hooks/use-transaction-kpi-row'

import { KpiSummaryDialog } from './kpi-summary-dialog'

const KPI_ICONS: Record<TransactionKpiCard['icon'], LucideIcon> = {
  mySpend: CircleMinus,
  pendingSplits: CirclePlus,
  toPay: Clock,
  toReceive: CirclePlus,
  overdue: AlertCircle,
}

export function TransactionKpiRow() {
  const { cards, openKpi, setOpenKpi, activeDialog } = useTransactionKpiRow()

  return (
    <>
      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 xl:grid-cols-5 lg:px-6">
        {cards.map(card => {
          const Icon = KPI_ICONS[card.icon]
          return (
            <div key={card.key} className="kpi-card">
              <div className="mb-3 flex items-center gap-2">
                <Icon className={cn('size-4', card.iconClass)} />
                <span className="text-sm font-medium text-slate-600">{card.label}</span>
              </div>
              {card.clickable ? (
                <button
                  type="button"
                  className={cn(
                    'text-left text-2xl font-bold tabular-nums tracking-tight transition-opacity hover:opacity-70',
                    card.valueClass
                  )}
                  onClick={() => setOpenKpi(card.key)}
                >
                  {card.value}
                </button>
              ) : (
                <p className={cn('text-2xl font-bold tabular-nums tracking-tight', card.valueClass)}>
                  {card.value}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
            </div>
          )
        })}
      </div>

      {activeDialog && (
        <KpiSummaryDialog
          open={openKpi != null}
          onOpenChange={open => {
            if (!open) setOpenKpi(null)
          }}
          title={activeDialog.title}
          description={activeDialog.description}
          totalLabel={activeDialog.totalLabel}
          total={activeDialog.total}
          totalClassName={activeDialog.totalClassName}
          items={activeDialog.items}
          isLoading={activeDialog.isLoading}
          emptyMessage={activeDialog.emptyMessage}
          footerHint={activeDialog.footerHint}
        />
      )}
    </>
  )
}
