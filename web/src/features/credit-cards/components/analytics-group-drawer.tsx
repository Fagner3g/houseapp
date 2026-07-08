import dayjs from 'dayjs'
import { X } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TransactionList } from '@/features/transactions/components/transaction-list'
import { toTransactionListItem } from '@/features/transactions/types'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { formatCentsString } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { useDrawerStore } from '@/stores/drawers'

import { useInvoiceCycleTransactions } from '../hooks/use-invoice-cycle-transactions'
import { useSplitTransactionIds } from '../hooks/use-split-transaction-ids'
import { filterAnalyticsGroupTransactions } from '../lib/filter-analytics-group-transactions'

export function AnalyticsGroupDrawer() {
  const { slug } = useActiveOrganization()
  const open = useDrawerStore(s => s.analyticsGroupDrawerOpen)
  const context = useDrawerStore(s => s.analyticsGroupContext)
  const transactionDrawerOpen = useDrawerStore(s => s.transactionDrawerOpen)
  const close = useDrawerStore(s => s.closeAnalyticsGroupDrawer)

  const dateFrom = context
    ? dayjs(context.purchasesPeriod.start).startOf('day').toISOString()
    : undefined
  const dateTo = context
    ? dayjs(context.purchasesPeriod.end).endOf('day').toISOString()
    : undefined

  const { transactions, isPending } = useInvoiceCycleTransactions(
    slug,
    context
      ? {
          accountId: context.accountId,
          type: 'expense',
          dateFrom,
          dateTo,
          perPage: 100,
        }
      : undefined,
    open && !!slug && !!context
  )

  const filteredTransactions = useMemo(() => {
    if (!context) return []

    return filterAnalyticsGroupTransactions(
      transactions,
      { type: context.groupType, key: context.groupKey },
      context.purchasesPeriod
    )
  }, [context, transactions])

  const filteredTransactionIds = useMemo(
    () => filteredTransactions.map(transaction => transaction.id),
    [filteredTransactions]
  )
  const { data: splitData } = useSplitTransactionIds(slug, filteredTransactionIds)
  const fullyDelegatedById = splitData?.fullyDelegatedById ?? new Map<string, string>()
  const partiallyDividedById = splitData?.partiallyDividedById ?? new Map<string, string>()

  const purchaseCount = context?.occurrenceCount ?? filteredTransactions.length
  const purchaseLabel =
    purchaseCount === 1 ? '1 compra nesta fatura' : `${purchaseCount} compras nesta fatura`

  return (
    <Dialog
      open={open && !!context}
      modal={!transactionDrawerOpen}
      onOpenChange={value => {
        if (!value && !transactionDrawerOpen) close()
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-40"
        className={cn(
          'z-[41] flex max-h-[85vh] w-[min(72rem,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(72rem,calc(100vw-2rem))]',
          transactionDrawerOpen && 'pointer-events-none'
        )}
        onInteractOutside={event => {
          if (transactionDrawerOpen) event.preventDefault()
        }}
        onPointerDownOutside={event => {
          if (transactionDrawerOpen) event.preventDefault()
        }}
      >
        {context ? (
          <>
            <DialogHeader className="shrink-0 border-b border-slate-100 px-4 pb-4 pt-4 text-left md:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {context.color ? (
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: context.color }}
                      />
                    ) : null}
                    <DialogTitle className="text-lg font-semibold text-slate-900">
                      {context.label}
                    </DialogTitle>
                    {context.groupType === 'merchant' && purchaseCount >= 2 ? (
                      <Badge
                        variant="secondary"
                        className="border-violet-200 bg-violet-50 text-[10px] font-medium text-violet-700"
                      >
                        Recorrente
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {purchaseLabel} · Compras {context.purchasesLabel}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {context.accountName} · Fatura de {context.cycleLabel}
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                    {formatCentsString(context.total)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Fechar"
                  className={cn(
                    'shrink-0 rounded-full p-1.5 text-slate-400 transition-colors',
                    'hover:bg-slate-100 hover:text-slate-600'
                  )}
                  onClick={close}
                >
                  <X className="size-5" />
                </button>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-auto py-3">
              {isPending ? (
                <div className="flex min-h-40 items-center justify-center px-6 text-sm text-slate-500">
                  Carregando compras...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="flex min-h-40 items-center justify-center px-6 text-center text-sm text-slate-500">
                  Nenhuma compra encontrada para este agrupamento.
                </div>
              ) : (
                <TransactionList
                  items={filteredTransactions.map(toTransactionListItem)}
                  variant="credit_card_statement"
                  accountId={context.accountId}
                  fullyDelegatedById={fullyDelegatedById}
                  partiallyDividedById={partiallyDividedById}
                  containerClassName="mx-4 overflow-x-auto lg:mx-6"
                />
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
