import dayjs from 'dayjs'
import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useListCards, useListStatements } from '@/api/generated/api'
import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import type { ListViewMode } from '@/components/list-view-mode-toggle'
import { ImportStatementDialog } from '@/features/accounts/components/import-statement-dialog'
import { CreditCardStatementGroups } from './credit-card-statement-groups'
import { TransactionList } from '@/features/transactions/components/transaction-list'
import { toTransactionListItem } from '@/features/transactions/types'
import type { BillingCycle } from '@/lib/billing-cycle'
import {
  findStatementForCycle,
  findPreviousStatementForCycle,
  formatDateRange,
  formatImportedPurchasePeriodRange,
} from '@/lib/billing-cycle'
import {
  filterTransactionsForInvoiceCycle,
  resolvePaymentPeriod,
  resolvePurchasesPeriod,
} from '@/lib/credit-card-invoice-metrics'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useDrawerStore } from '@/stores/drawers'

import {
  computeInvoiceFilterCounts,
  defaultInvoiceStatementFilters,
  filterInvoiceTransactions,
  resolveInvoiceQuickFilter,
  type InvoiceQuickFilter,
  type InvoiceStatementFilters,
} from './credit-card-statement-filter-utils'
import { CreditCardStatementFilters } from './credit-card-statement-filters'
import {
  CreditCardStatementFiltersSkeleton,
  CreditCardStatementTableSkeleton,
} from './credit-card-invoice-skeletons'
import { useSplitTransactionIds } from '../hooks/use-split-transaction-ids'
import { useInvoiceCycleTransactions } from '../hooks/use-invoice-cycle-transactions'
import { hasImportedInvoiceTotal } from '@/lib/credit-card-invoice-metrics'
import type { PartialSplitBadgeInfo } from '@/features/transactions/lib/split-badge-label'

interface CreditCardStatementSectionProps {
  accountId: string
  cycle: BillingCycle
  closingDay: number
  dueDay: number
  initialQuickFilter?: InvoiceQuickFilter
  onImported: () => void
  onViewExistingStatement?: (params: { accountId: string; monthKey: string }) => void
}

function invoiceTransactions(
  transactions: ListTransactions200TransactionsItem[],
  cycle: BillingCycle,
  matchedStatement: ReturnType<typeof findStatementForCycle>,
  paymentContext: {
    previousStatement: ReturnType<typeof findPreviousStatementForCycle>
    closingDay: number
    dueDay: number
  }
) {
  return filterTransactionsForInvoiceCycle(
    transactions,
    cycle,
    matchedStatement,
    paymentContext
  ).sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
}

export function CreditCardStatementSection({
  accountId,
  cycle,
  closingDay,
  dueDay,
  initialQuickFilter,
  onImported,
  onViewExistingStatement,
}: CreditCardStatementSectionProps) {
  const { slug } = useActiveOrganization()
  const openTransactionDrawer = useDrawerStore(s => s.openTransactionDrawer)
  const sectionRef = useRef<HTMLElement>(null)
  const [filters, setFilters] = useState<InvoiceStatementFilters>(() => ({
    ...defaultInvoiceStatementFilters(),
    quickFilter: initialQuickFilter ?? 'all',
  }))
  const [viewMode, setViewMode] = useState<ListViewMode>('list')

  const { data: statementsData } = useListStatements(slug, accountId, {
    query: { enabled: !!slug && !!accountId },
  })

  const matchedStatement = useMemo(
    () =>
      findStatementForCycle(statementsData?.statements ?? [], cycle, {
        closingDay,
        dueDay,
      }),
    [statementsData?.statements, cycle, closingDay, dueDay]
  )

  const previousStatement = useMemo(
    () =>
      findPreviousStatementForCycle(statementsData?.statements ?? [], cycle, closingDay, dueDay),
    [statementsData?.statements, cycle, closingDay, dueDay]
  )

  const paymentContext = useMemo(
    () => ({ previousStatement, closingDay, dueDay }),
    [previousStatement, closingDay, dueDay]
  )

  const purchasesPeriod = resolvePurchasesPeriod(cycle, matchedStatement)
  const paymentPeriod = resolvePaymentPeriod(cycle, matchedStatement, paymentContext)
  const hasImportedStatement = hasImportedInvoiceTotal(matchedStatement)

  const dateFromIso = dayjs(purchasesPeriod.start).startOf('day').toISOString()
  const dateToIso = dayjs(paymentPeriod.end).endOf('day').toISOString()

  const { data: cardsData } = useListCards(slug, accountId, {
    query: { enabled: !!slug && !!accountId },
  })

  const cards = cardsData?.cards ?? []
  const activeCards = cards.filter(card => card.status === 'active')
  const showCardFilter = activeCards.length > 1

  const { transactions: cycleTransactions, isPending: cyclePending } =
    useInvoiceCycleTransactions(
      slug,
      { accountId, dateFrom: dateFromIso, dateTo: dateToIso, perPage: 100 },
      !!slug && !!accountId
    )

  const baseItems = useMemo(
    () =>
      invoiceTransactions(
        cycleTransactions,
        cycle,
        matchedStatement,
        paymentContext
      ),
    [cycleTransactions, cycle, matchedStatement, paymentContext]
  )

  const transactionIds = useMemo(() => baseItems.map(item => item.id), [baseItems])
  const { data: splitData } = useSplitTransactionIds(slug, transactionIds)
  const fullyDelegatedById = splitData?.fullyDelegatedById ?? new Map<string, string>()
  const partiallyDividedById =
    splitData?.partiallyDividedById ?? new Map<string, PartialSplitBadgeInfo>()
  const dividedTransactionIds = splitData?.transactionIds ?? new Set<string>()

  const filterCounts = useMemo(
    () => computeInvoiceFilterCounts(baseItems, dividedTransactionIds),
    [baseItems, dividedTransactionIds]
  )

  const filteredItems = useMemo(() => {
    const quickFilter = resolveInvoiceQuickFilter(filters.quickFilter, filterCounts)
    return filterInvoiceTransactions(
      baseItems,
      { ...filters, quickFilter },
      dividedTransactionIds
    )
  }, [baseItems, filters, filterCounts, dividedTransactionIds])

  const updateFilters = useCallback((patch: Partial<InvoiceStatementFilters>) => {
    setFilters(current => ({ ...current, ...patch }))
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset filters when account or billing cycle changes
  useEffect(() => {
    setFilters({
      ...defaultInvoiceStatementFilters(),
      quickFilter: initialQuickFilter ?? 'all',
    })
  }, [accountId, cycle.monthKey, initialQuickFilter])

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when navigating to divided filter on another cycle
  useEffect(() => {
    if (initialQuickFilter !== 'divided') return
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [initialQuickFilter, accountId, cycle.monthKey])

  const hasPayments = baseItems.some(tx => tx.type === 'income')
  const purchasesLabel = purchasesPeriod.usesImportedStatementPeriod
    ? `Período do arquivo: ${formatImportedPurchasePeriodRange(purchasesPeriod.start, purchasesPeriod.end)}`
    : `Ciclo do cartão: ${formatDateRange(purchasesPeriod.start, purchasesPeriod.end)}`

  return (
    <section ref={sectionRef} className="mt-6 space-y-4">
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Compras e pagamentos</h2>
          <p className="text-sm text-slate-500">
            {purchasesLabel}
            {hasPayments && (
              <> · pagamentos até {dayjs(paymentPeriod.end).format('DD/MM/YYYY')}</>
            )}
          </p>
          {!hasImportedStatement && (
            <p className="mt-1 text-xs text-amber-800">
              Sem fatura importada para este mês — a lista abaixo vem dos lançamentos registrados.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportStatementDialog
            accountId={accountId}
            closingDay={closingDay}
            dueDay={dueDay}
            onImported={onImported}
            onViewExistingStatement={onViewExistingStatement}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() =>
              openTransactionDrawer(
                {
                  accountId,
                  type: 'expense',
                  date: dayjs().toISOString(),
                  ...(filters.cardId !== 'all' && filters.cardId !== 'unassigned'
                    ? { cardId: filters.cardId }
                    : {}),
                },
                null,
                { lockAccountId: accountId }
              )
            }
          >
            <Plus className="mr-1.5 size-4" />
            Adicionar lançamento
          </Button>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        {cyclePending ? (
          <CreditCardStatementFiltersSkeleton />
        ) : (
          <CreditCardStatementFilters
            filters={filters}
            counts={filterCounts}
            viewMode={viewMode}
            showCardFilter={showCardFilter}
            cards={activeCards}
            onChange={updateFilters}
            onViewModeChange={setViewMode}
          />
        )}
      </div>

      {cyclePending ? (
        <CreditCardStatementTableSkeleton />
      ) : viewMode === 'grouped' ? (
        <CreditCardStatementGroups
          transactions={filteredItems}
          accountId={accountId}
          cards={showCardFilter ? activeCards : undefined}
          fullyDelegatedById={fullyDelegatedById}
          partiallyDividedById={partiallyDividedById}
          dividedTransactionIds={dividedTransactionIds}
        />
      ) : (
        <TransactionList
          items={filteredItems.map(toTransactionListItem)}
          variant="credit_card_statement"
          accountId={accountId}
          cards={showCardFilter ? activeCards : undefined}
          fullyDelegatedById={fullyDelegatedById}
          partiallyDividedById={partiallyDividedById}
        />
      )}
    </section>
  )
}
