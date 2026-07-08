import dayjs from 'dayjs'
import { CalendarDays, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatCurrency, numberToCents } from '@/lib/currency'
import type { BillingCycle } from '@/lib/billing-cycle'
import { formatDateRange, formatImportedPurchasePeriodRange } from '@/lib/billing-cycle'
import { useDrawerStore } from '@/stores/drawers'
import { cn } from '@/lib/utils'

import { useCreditCardInvoiceMetrics } from '../hooks/use-credit-card-invoice-metrics'
import { CreditCardKpiSkeleton } from './credit-card-invoice-skeletons'

interface CreditCardKpiRowProps {
  accountId: string
  accountName: string
  cycle: BillingCycle
  closingDay: number
  dueDay: number
}

function SummaryLine({
  label,
  amount,
  emphasis = false,
  negative = false,
}: {
  label: string
  amount: number
  emphasis?: boolean
  negative?: boolean
}) {
  const formatted =
    negative && amount > 0 ? `− ${formatCurrency(amount)}` : formatCurrency(amount)

  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className={cn('text-slate-600', emphasis && 'font-medium text-slate-800')}>
        {label}
      </span>
      <span
        className={cn(
          'shrink-0 tabular-nums',
          emphasis ? 'text-base font-semibold text-slate-900' : 'font-medium text-slate-800',
          negative && amount > 0 && 'text-emerald-700'
        )}
      >
        {formatted}
      </span>
    </div>
  )
}

export function CreditCardKpiRow({
  accountId,
  accountName,
  cycle,
  closingDay,
  dueDay,
}: CreditCardKpiRowProps) {
  const openPayInvoiceDrawer = useDrawerStore(s => s.openPayInvoiceDrawer)

  const {
    metrics,
    matchedStatement,
    purchasesPeriod,
    dueDate,
    isPaid,
    isSettledEmpty,
    isOverdue,
    isPending,
  } = useCreditCardInvoiceMetrics(accountId, cycle, closingDay, dueDay)

  const purchasesLabel = metrics.usesImportedStatementPeriod
    ? formatImportedPurchasePeriodRange(purchasesPeriod.start, purchasesPeriod.end)
    : formatDateRange(cycle.periodStart, cycle.periodEnd)

  const invoiceTotalLabel = formatCurrency(metrics.invoiceTotal)

  const supportsManualPayment =
    matchedStatement?.importSource !== 'ofx' && matchedStatement?.importSource !== 'xlsx'

  const heroAmount = isPaid
    ? metrics.invoiceTotal
    : isSettledEmpty
      ? 0
      : metrics.remaining

  const heroSubtitle = isPaid
    ? metrics.payments >= metrics.invoiceTotal
      ? 'Pago integralmente'
      : 'Saldo em aberto: R$ 0,00'
    : !isSettledEmpty && metrics.payments > 0
      ? `de ${invoiceTotalLabel} no total da fatura`
      : isSettledEmpty
        ? 'Sem lançamentos neste ciclo'
        : null

  const handlePayInvoice = () => {
    if (metrics.remaining <= 0) return
    openPayInvoiceDrawer({
      creditCardAccountId: accountId,
      creditCardName: accountName,
      cycleLabel: cycle.label,
      dueDate,
      amountCents: numberToCents(metrics.remaining),
    })
  }

  const showBreakdown =
    metrics.purchases > 0 ||
    metrics.previousBalance > 0 ||
    metrics.payments > 0 ||
    metrics.invoiceTotal > 0

  if (isPending) {
    return <CreditCardKpiSkeleton />
  }

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
                    Fatura quitada
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
              </div>
              {isPaid && (
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-emerald-600/80">
                  Total da fatura
                </p>
              )}
              <p
                className={cn(
                  'text-4xl font-bold tabular-nums tracking-tight',
                  isPaid ? 'mt-0.5' : 'mt-1',
                  isPaid ? 'text-emerald-700' : isOverdue ? 'text-rose-700' : 'text-slate-900'
                )}
              >
                {formatCurrency(heroAmount)}
              </p>
              {heroSubtitle && (
                <p
                  className={cn(
                    'mt-1 text-sm',
                    isPaid ? 'text-emerald-600' : 'text-slate-500'
                  )}
                >
                  {heroSubtitle}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 shrink-0" />
                  {isPaid && dayjs(dueDate).isBefore(dayjs(), 'day')
                    ? `Venceu ${dayjs(dueDate).format('DD/MM/YYYY')}`
                    : `Vence ${dayjs(dueDate).format('DD/MM/YYYY')}`}
                </span>
                <span className="hidden text-slate-300 sm:inline">·</span>
                <span>Compras {purchasesLabel}</span>
              </div>
            </div>

            {!isPaid && !isSettledEmpty && supportsManualPayment && (
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

        {showBreakdown && (
          <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              Composição
            </p>
            <div className="space-y-2">
              {metrics.previousBalance > 0 && (
                <SummaryLine label="Saldo anterior" amount={metrics.previousBalance} />
              )}
              <SummaryLine label={`Compras (${purchasesLabel})`} amount={metrics.purchases} />
              {metrics.payments > 0 && (
                <SummaryLine label="Pagamentos" amount={metrics.payments} negative />
              )}
              <div className="border-t border-dashed border-slate-200 pt-2">
                <SummaryLine
                  label="Total da fatura"
                  amount={metrics.invoiceTotal}
                  emphasis
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
