import dayjs from 'dayjs'
import { AlertTriangle, ChevronRight } from 'lucide-react'

import { useListTransactions } from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import { useCardOverdueInvoices } from '@/features/credit-cards/hooks/use-card-overdue-invoices'
import { useCreditCardCyclePending } from '@/features/credit-cards/hooks/use-credit-card-cycle-pending'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { formatCentsString, formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import type { BillingCycle } from '@/lib/billing-cycle'

interface CreditCardOverdueBannerProps {
  accountId: string
  cycle: BillingCycle
  closingDay: number
  dueDay: number
  viewingMonthKey: string
  onNavigateToMonth: (monthKey: string) => void
}

function shortMonthLabel(monthKey: string) {
  const label = dayjs(`${monthKey}-01`).format('MMM/YY')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function CreditCardOverdueBanner({
  accountId,
  cycle,
  closingDay,
  dueDay,
  viewingMonthKey,
  onNavigateToMonth,
}: CreditCardOverdueBannerProps) {
  const { slug } = useActiveOrganization()
  const cyclePending = useCreditCardCyclePending(accountId, cycle, closingDay, dueDay)

  const cardOverdueInvoices = useCardOverdueInvoices(accountId)

  const { data: txData } = useListTransactions(
    slug,
    {
      accountId,
      dateTo: dayjs().subtract(1, 'day').endOf('day').toISOString(),
      payableOnly: true,
      perPage: 5,
    },
    { query: { enabled: !!slug && !!accountId } }
  )

  const overdueTransactions = txData?.transactions ?? []
  const invoiceCount = cardOverdueInvoices.length
  const totalCount = invoiceCount + overdueTransactions.length

  if (cyclePending || totalCount === 0) return null

  const totalOpen = cardOverdueInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.remaining),
    0
  )

  const viewingOverdue = cardOverdueInvoices.some(inv => inv.monthKey === viewingMonthKey)
  const otherOverdue = cardOverdueInvoices.filter(inv => inv.monthKey !== viewingMonthKey)
  const otherOverdueTotal = otherOverdue.reduce(
    (sum, invoice) => sum + Number(invoice.remaining),
    0
  )

  // Na fatura em atraso que já está aberta, o resumo principal cobre o valor — só avisa das outras.
  if (viewingOverdue && overdueTransactions.length === 0) {
    if (otherOverdue.length === 0) return null

    const next = otherOverdue[0] as (typeof otherOverdue)[number]

    return (
      <div className="mx-4 lg:mx-6">
        <button
          type="button"
          onClick={() => onNavigateToMonth(next.monthKey)}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-rose-200/80 bg-rose-50/50 px-4 py-2.5 text-left text-sm text-rose-800 transition-colors hover:bg-rose-50"
        >
          <span>
            Mais {otherOverdue.length} fatura{otherOverdue.length > 1 ? 's' : ''} em atraso
            {' · '}
            <span className="font-semibold tabular-nums">{formatCurrency(otherOverdueTotal)}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium">
            Próxima: {shortMonthLabel(next.monthKey)}
            <ChevronRight className="size-4" />
          </span>
        </button>
      </div>
    )
  }

  const oldestOverdue = cardOverdueInvoices[0]

  return (
    <div className="mx-4 lg:mx-6">
      <div className="rounded-lg border border-rose-200/80 bg-rose-50/50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-rose-900">
            <AlertTriangle className="size-4 shrink-0 text-rose-600" />
            <span>
              {invoiceCount > 0
                ? `${invoiceCount} fatura${invoiceCount > 1 ? 's' : ''} em atraso`
                : `${totalCount} lançamento${totalCount > 1 ? 's' : ''} em atraso`}
            </span>
            {invoiceCount > 0 && (
              <span className="font-semibold tabular-nums text-rose-800">
                {formatCurrency(totalOpen)}
              </span>
            )}
          </div>

          {oldestOverdue && !viewingOverdue && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-rose-200 bg-white px-3 text-rose-800 hover:bg-rose-50"
              onClick={() => onNavigateToMonth(oldestOverdue.monthKey)}
            >
              Ir para {shortMonthLabel(oldestOverdue.monthKey)}
              <ChevronRight className="ml-1 size-3.5" />
            </Button>
          )}
        </div>

        {invoiceCount > 0 && (
          <ul className="mt-2.5 divide-y divide-rose-100/80">
            {cardOverdueInvoices.map(invoice => {
              const overdueDays = dayjs()
                .startOf('day')
                .diff(dayjs(invoice.date).startOf('day'), 'day')
              const isViewing = invoice.monthKey === viewingMonthKey

              return (
                <li key={invoice.id}>
                  <button
                    type="button"
                    onClick={() => onNavigateToMonth(invoice.monthKey)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 py-2 text-left text-sm transition-colors hover:text-rose-900',
                      isViewing ? 'text-rose-900' : 'text-rose-800'
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-14 shrink-0 font-medium">
                        {shortMonthLabel(invoice.monthKey)}
                      </span>
                      {isViewing && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-700">
                          atual
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatCentsString(invoice.remaining)}
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs tabular-nums text-rose-600/90">
                      {overdueDays}d
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {overdueTransactions.length > 0 && (
          <ul className="mt-2 space-y-1 border-t border-rose-100/80 pt-2 text-sm text-rose-800">
            {overdueTransactions.map(tx => (
              <li key={tx.id} className="flex items-center justify-between gap-3">
                <span className="truncate font-medium">{tx.title}</span>
                <span className="shrink-0 tabular-nums">{formatCentsString(tx.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
