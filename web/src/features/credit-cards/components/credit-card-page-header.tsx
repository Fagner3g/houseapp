import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'

import type { BillingCycle } from '@/lib/billing-cycle'
import { formatInvoiceLabel } from '@/lib/billing-cycle'
import { useCardOverdueInvoices } from '@/features/credit-cards/hooks/use-card-overdue-invoices'
import { useCreditCardInvoiceMetrics } from '@/features/credit-cards/hooks/use-credit-card-invoice-metrics'
import { useSplitTransactionIds } from '@/features/credit-cards/hooks/use-split-transaction-ids'
import { resolveDebtorInvoiceHero } from '@/features/credit-cards/lib/debtor-invoice-hero'
import {
  sumCycleViewerShareAmount,
  sumCycleViewerShareRemaining,
} from '@/features/credit-cards/lib/cycle-split-remaining'
import { Button } from '@/components/ui/button'
import { CreditCardDueBadgeSkeleton } from '@/features/credit-cards/components/credit-card-invoice-skeletons'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { cn } from '@/lib/utils'

interface CreditCardPageHeaderProps {
  accountId: string
  cycle: BillingCycle
  closingDay: number
  dueDay: number
  isCurrentCycle: boolean
  canGoNextMonth: boolean
  canManage?: boolean
  onPrevMonth: () => void
  onNextMonth: () => void
  onGoToday: () => void
  onNavigateToMonth: (monthKey: string) => void
}

export function CreditCardPageHeader({
  accountId,
  cycle,
  closingDay,
  dueDay,
  isCurrentCycle,
  canGoNextMonth,
  canManage = true,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  onNavigateToMonth,
}: CreditCardPageHeaderProps) {
  const { slug } = useActiveOrganization()
  const isDebtorView = canManage === false
  const overdueInvoices = useCardOverdueInvoices(accountId)
  const {
    isOverdue: bankIsOverdue,
    isPaid: bankIsPaid,
    isPending,
    dueDate,
    cycleTransactions,
  } = useCreditCardInvoiceMetrics(accountId, cycle, closingDay, dueDay)

  const transactionIds = useMemo(
    () => cycleTransactions.map(transaction => transaction.id),
    [cycleTransactions]
  )
  const { data: splitData } = useSplitTransactionIds(
    slug,
    isDebtorView ? transactionIds : []
  )

  const debtorHero = useMemo(() => {
    if (!isDebtorView) return null
    const viewerShareById = splitData?.viewerShareById ?? new Map()
    return resolveDebtorInvoiceHero({
      dueDate,
      shareTotal: sumCycleViewerShareAmount(transactionIds, viewerShareById),
      shareRemaining: sumCycleViewerShareRemaining(transactionIds, viewerShareById),
    })
  }, [isDebtorView, splitData?.viewerShareById, transactionIds, dueDate])

  const isOverdue = debtorHero?.isOverdue ?? bankIsOverdue
  const isPaid = debtorHero?.isPaid ?? bankIsPaid

  const overdueCount = overdueInvoices.length
  const oldestOverdue = overdueInvoices[0]

  const dueLabel = isOverdue
    ? dueDay
      ? `Em atraso · venceu dia ${dueDay}`
      : `Em atraso · venceu ${dayjs(cycle.dueDate).format('DD/MM')}`
    : isPaid
      ? dueDay
        ? `Quitada · venceu dia ${dueDay}`
        : `Quitada · venceu ${dayjs(cycle.dueDate).format('DD/MM')}`
      : dueDay
        ? `Vence dia ${dueDay}`
        : cycle.dueDate
          ? `Vence ${dayjs(cycle.dueDate).format('DD/MM')}`
          : null

  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={onPrevMonth}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-[180px] text-center">
            <span className="block text-sm font-semibold text-slate-900">
              {formatInvoiceLabel(cycle.monthKey)}
            </span>
          </div>
          {!isCurrentCycle && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-xs"
              onClick={onGoToday}
            >
              Hoje
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={onNextMonth}
            disabled={!canGoNextMonth}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {overdueCount > 0 && oldestOverdue && oldestOverdue.monthKey !== cycle.monthKey && (
            <button
              type="button"
              onClick={() => onNavigateToMonth(oldestOverdue.monthKey)}
              className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
            >
              {overdueCount} fatura{overdueCount > 1 ? 's' : ''} em atraso
            </button>
          )}
          {isPending ? (
            <CreditCardDueBadgeSkeleton />
          ) : (
            dueLabel && (
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium',
                  isOverdue
                    ? 'bg-rose-50 text-rose-700'
                    : isPaid
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                )}
              >
                {dueLabel}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )
}
