import dayjs from 'dayjs'
import { CalendarDays, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatCurrency, numberToCents } from '@/lib/currency'
import type { BillingCycle } from '@/lib/billing-cycle'
import { useDrawerStore } from '@/stores/drawers'
import { cn } from '@/lib/utils'

import { useCreditCardKpiHero } from '../hooks/use-credit-card-kpi-hero'
import { CreditCardKpiSkeleton } from './credit-card-invoice-skeletons'
import { CreditCardKpiBreakdown } from './credit-card-kpi-breakdown'

interface CreditCardKpiRowProps {
  accountId: string
  accountName: string
  cycle: BillingCycle
  closingDay: number
  dueDay: number
  /** Permanent account ownership. When false, hero follows the viewer's unpaid share. */
  canManage?: boolean
  onViewAReceber?: () => void
}

export function CreditCardKpiRow({
  accountId,
  accountName,
  cycle,
  closingDay,
  dueDay,
  canManage = true,
  onViewAReceber,
}: CreditCardKpiRowProps) {
  const openPayInvoiceDrawer = useDrawerStore(s => s.openPayInvoiceDrawer)
  const hero = useCreditCardKpiHero(accountId, cycle, closingDay, dueDay, canManage)

  const handlePayInvoice = () => {
    if (hero.bankRemaining <= 0) return
    openPayInvoiceDrawer({
      creditCardAccountId: accountId,
      creditCardName: accountName,
      cycleLabel: cycle.label,
      dueDate: hero.dueDate,
      amountCents: numberToCents(hero.bankRemaining),
    })
  }

  if (hero.isPending) {
    return <CreditCardKpiSkeleton />
  }

  const { isPaid, isSettledEmpty, isOverdue } = hero

  return (
    <div className="px-4 lg:px-6">
      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-white shadow-sm',
          isOverdue && 'border-rose-200',
          isPaid && !isOverdue && 'border-emerald-200',
          !isOverdue && !isPaid && 'border-slate-200'
        )}
      >
        <div
          className={cn(
            'px-5 py-5 sm:px-6',
            isOverdue && 'bg-rose-50/50',
            isPaid && !isOverdue && 'bg-emerald-50/40',
            !isOverdue && !isPaid && 'bg-slate-50/40'
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {isPaid ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="size-4" />
                    {hero.paidLabel}
                  </span>
                ) : isSettledEmpty ? (
                  <span className="text-sm font-medium text-slate-600">Sem movimentação</span>
                ) : (
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isOverdue ? 'text-rose-700' : 'text-slate-600'
                    )}
                  >
                    {isOverdue ? 'Valor em atraso' : 'A pagar'}
                  </span>
                )}
                {hero.isInvoiceClosed && !isPaid && (
                  <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-medium text-slate-700">
                    Fatura fechada
                  </span>
                )}
              </div>
              {isPaid && (
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-emerald-600/80">
                  {hero.paidCaption}
                </p>
              )}
              <p
                className={cn(
                  'text-4xl font-bold tabular-nums tracking-tight',
                  isPaid ? 'mt-0.5' : 'mt-1',
                  isPaid ? 'text-emerald-700' : isOverdue ? 'text-rose-700' : 'text-slate-900'
                )}
              >
                {formatCurrency(hero.heroAmount)}
              </p>
              {hero.heroSubtitle && (
                <p
                  className={cn('mt-1 text-sm', isPaid ? 'text-emerald-600' : 'text-slate-500')}
                >
                  {hero.heroSubtitle}
                </p>
              )}
              {hero.pendingSplitRemaining > 0 && (
                <p className="mt-1 text-sm font-medium text-amber-700">
                  {formatCurrency(hero.pendingSplitRemaining)} a receber de divisões
                  {onViewAReceber ? (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="underline-offset-2 hover:underline"
                        onClick={onViewAReceber}
                      >
                        Ver
                      </button>
                    </>
                  ) : null}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 shrink-0" />
                  {isOverdue ||
                  (isPaid && dayjs(hero.dueDate).isBefore(dayjs(), 'day'))
                    ? `Venceu ${dayjs(hero.dueDate).format('DD/MM/YYYY')}`
                    : `Vence ${dayjs(hero.dueDate).format('DD/MM/YYYY')}`}
                </span>
                <span className="hidden text-slate-300 sm:inline">·</span>
                <span>Compras {hero.purchasesLabel}</span>
              </div>
            </div>

            {!isPaid && !isSettledEmpty && hero.supportsManualPayment && (
              <Button
                type="button"
                size="lg"
                className={cn(
                  'w-full shrink-0 rounded-lg sm:w-auto',
                  isOverdue && 'bg-rose-600 hover:bg-rose-700'
                )}
                onClick={handlePayInvoice}
              >
                Pagar fatura
              </Button>
            )}
          </div>
        </div>

        {hero.showBreakdown && (
          <CreditCardKpiBreakdown
            previousBalance={hero.metrics.previousBalance}
            purchases={hero.metrics.purchases}
            purchasesLabel={hero.purchasesLabel}
            payments={hero.metrics.payments}
            invoiceTotal={hero.metrics.invoiceTotal}
            pendingSplitRemaining={hero.pendingSplitRemaining}
            onViewAReceber={onViewAReceber}
          />
        )}
      </div>
    </div>
  )
}
