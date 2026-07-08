import dayjs from 'dayjs'
import { BarChart3, CalendarDays, ChevronDown, Info, Repeat, Share2, Store, Tag } from 'lucide-react'
import type { ElementType } from 'react'
import { useMemo, useState } from 'react'

import { useGetReportByCategory, useGetReportTopMerchants } from '@/api/generated/api'
import { CategoryBreakdownChart } from '@/components/charts/category-breakdown-chart'
import {
  ExpenseRankingList,
  formatMerchantSubtitle,
  type ExpenseRankingItem,
} from '@/components/expense-ranking-list'
import { QuickFilterBadges } from '@/components/quick-filter-badges'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mapCategoryToChartData } from '@/features/home/lib/chart-mappers'
import type { BillingCycle } from '@/lib/billing-cycle'
import {
  formatDateRange,
  formatImportedPurchasePeriodRange,
  formatInvoiceLabel,
  resolveStatementViewMonthKey,
} from '@/lib/billing-cycle'
import { formatCurrency, moneyStringToReais, reaisToCents } from '@/lib/currency'
import {
  computeInvoiceAmountReconciliation,
  computePersonalSpendAdjustment,
  hasImportedInvoiceTotal,
  listInvoiceAdjustmentCredits,
  listInvoiceBillPayments,
  resolveUnlistedInvoiceCredits,
  getUnlistedInvoiceCreditsCopy,
  type InvoiceAdjustmentLine,
} from '@/lib/credit-card-invoice-metrics'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { cn } from '@/lib/utils'
import { useDrawerStore, type AnalyticsGroupContext } from '@/stores/drawers'

import {
  aggregateCategoriesFromTransactions,
  aggregateMerchantsFromTransactions,
  filterDividedExpenseTransactions,
} from '../lib/compute-divided-analytics'
import { useCreditCardInvoiceMetrics } from '../hooks/use-credit-card-invoice-metrics'
import { useSplitTransactionIds } from '../hooks/use-split-transaction-ids'
import { CreditCardAnalyticsSkeleton } from './credit-card-invoice-skeletons'

interface CreditCardAnalyticsSectionProps {
  accountId: string
  accountName: string
  cycle: BillingCycle
  closingDay: number
  dueDay: number
  onNavigateToMonth?: (monthKey: string) => void
  onViewDividedTransactions?: () => void
  onViewInvoiceCredits?: () => void
  onViewInvoicePayments?: () => void
}

type MerchantQuickFilter = 'all' | 'recurring' | 'single' | 'installments'
type AnalyticsSpendingView = 'all' | 'personal'

const MERCHANT_QUICK_FILTERS: Array<{
  id: MerchantQuickFilter
  label: string
}> = [
  { id: 'all', label: 'Todos' },
  { id: 'recurring', label: 'Recorrentes' },
  { id: 'installments', label: 'Parceladas' },
  { id: 'single', label: 'Avulsos' },
]

const TOP_MERCHANTS_LIMIT = 15
const MERCHANT_FETCH_LIMIT = 50

function AnalyticsStat({
  icon: Icon,
  label,
  value,
  iconClass,
  onClick,
  isActive,
}: {
  icon: ElementType
  label: string
  value: string
  iconClass: string
  onClick?: () => void
  isActive?: boolean
}) {
  const Comp = onClick ? 'button' : 'div'

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'rounded-lg border border-violet-100/80 bg-white/70 px-3 py-2.5 text-left backdrop-blur-sm',
        onClick &&
          'cursor-pointer transition-colors hover:border-violet-200 hover:bg-white',
        isActive && 'border-violet-300 bg-white ring-1 ring-violet-200'
      )}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={cn('size-3.5', iconClass)} />
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <p className="text-lg font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
    </Comp>
  )
}

function AnalyticsError({ message }: { message: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}

function BridgeLine({
  label,
  amount,
  deduction = false,
  emphasis = false,
  subtotal = false,
  prefix,
}: {
  label: string
  amount: number
  deduction?: boolean
  emphasis?: boolean
  subtotal?: boolean
  prefix?: string
}) {
  const formatted =
    deduction && amount > 0 ? `− ${formatCurrency(amount)}` : formatCurrency(amount)
  const isHighlighted = emphasis || subtotal

  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 text-sm',
        emphasis && 'border-t border-slate-200 pt-2 font-medium',
        subtotal && 'font-medium'
      )}
    >
      <span className={cn('min-w-0 truncate', isHighlighted ? 'text-slate-800' : 'text-slate-600')}>
        {prefix && <span className="text-slate-400">{prefix} </span>}
        {label}
      </span>
      <span
        className={cn(
          'shrink-0 tabular-nums',
          deduction && amount > 0
            ? 'text-emerald-700'
            : isHighlighted
              ? 'text-slate-900'
              : 'text-slate-800'
        )}
      >
        {formatted}
      </span>
    </div>
  )
}

function AnalyticsSpendingToggle({
  value,
  allTotal,
  personalTotal,
  onChange,
}: {
  value: AnalyticsSpendingView
  allTotal: number
  personalTotal: number
  onChange: (value: AnalyticsSpendingView) => void
}) {
  const options: Array<{
    id: AnalyticsSpendingView
    label: string
    total: number
    hint: string
  }> = [
    {
      id: 'all',
      label: 'Todas as compras',
      total: allTotal,
      hint: 'Valor bruto no cartão, incluindo delegadas',
    },
    {
      id: 'personal',
      label: 'Meu gasto',
      total: personalTotal,
      hint: 'Líquido após divisões e delegações',
    },
  ]

  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      {options.map(option => {
        const isActive = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors',
              isActive
                ? 'border-violet-300 bg-violet-50/80 ring-1 ring-violet-200'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
            )}
          >
            <p
              className={cn(
                'text-xs font-medium uppercase tracking-wide',
                isActive ? 'text-violet-700' : 'text-slate-500'
              )}
            >
              {option.label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
              {formatCurrency(option.total)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{option.hint}</p>
          </button>
        )
      })}
    </div>
  )
}

function DualMetricsHero({
  mySpend,
  invoiceTotal,
  hasImportedInvoice,
  invoiceCredits,
  invoicePayments,
}: {
  mySpend: number
  invoiceTotal: number
  hasImportedInvoice: boolean
  invoiceCredits: number
  invoicePayments: number
}) {
  const showDelta =
    hasImportedInvoice &&
    mySpend > 0 &&
    reaisToCents(invoiceTotal) !== reaisToCents(mySpend)

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-6">
      <div>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-4xl">
          {formatCurrency(mySpend)}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-700">Meu gasto</p>
        <p className="mt-0.5 text-sm text-slate-500">
          Suas compras no período, descontando divisões
        </p>
      </div>

      <div className="sm:border-l sm:border-slate-200 sm:pl-6">
        {hasImportedInvoice ? (
          <>
            <p className="text-3xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-4xl">
              {formatCurrency(invoiceTotal)}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">Total da fatura</p>
            <p className="mt-0.5 text-sm text-slate-500">Valor importado do banco</p>
          </>
        ) : (
          <>
            <p className="text-3xl font-bold tabular-nums tracking-tight text-slate-400 sm:text-4xl">
              —
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">Total da fatura</p>
            <p className="mt-0.5 text-sm text-slate-500">Importe a fatura OFX para ver o total</p>
          </>
        )}
      </div>

      {showDelta && (invoiceCredits > 0 || invoicePayments > 0) && (
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {invoiceCredits > 0 && (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium tabular-nums text-emerald-800">
              − {formatCurrency(invoiceCredits)} em estornos e créditos
            </span>
          )}
          {invoicePayments > 0 && (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium tabular-nums text-blue-800">
              {formatCurrency(invoicePayments)} em pagamentos
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function InvoiceBridgeBreakdown({
  purchases,
  previousBalance,
  invoiceCredits,
  invoiceCharges,
  creditLines,
  paymentLines,
  splitAdjustment,
  mySpend,
  invoiceTotal,
  dividedCount,
  onViewDividedTransactions,
  onViewInvoiceCredits,
  onViewInvoicePayments,
}: {
  purchases: number
  previousBalance: number
  invoiceCredits: number
  invoiceCharges: number
  creditLines: InvoiceAdjustmentLine[]
  paymentLines: InvoiceAdjustmentLine[]
  splitAdjustment: number
  mySpend: number
  invoiceTotal: number
  dividedCount: number
  onViewDividedTransactions?: () => void
  onViewInvoiceCredits?: () => void
  onViewInvoicePayments?: () => void
}) {
  const unlistedCredits = resolveUnlistedInvoiceCredits(invoiceCredits, creditLines)
  const unlistedCreditsCopy = getUnlistedInvoiceCreditsCopy(creditLines.length > 0)
  const paymentTotal = paymentLines.reduce((sum, line) => sum + line.amount, 0)
  const hasExpandableCredits = creditLines.length > 0 || unlistedCredits > 0
  const [creditsExpanded, setCreditsExpanded] = useState(false)
  const [paymentsExpanded, setPaymentsExpanded] = useState(false)
  const showCreditsSection =
    invoiceCredits > 0 || invoiceCharges > 0 || previousBalance > 0 || paymentTotal > 0

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/50">
      <div className="space-y-1 px-4 py-3">
        <BridgeLine label="Compras no período" amount={purchases} />
        {splitAdjustment > 0 && (
          <BridgeLine label="Divisões" amount={splitAdjustment} deduction prefix="−" />
        )}
        <BridgeLine label="Meu gasto" amount={mySpend} emphasis prefix="=" />
        {splitAdjustment > 0 && onViewDividedTransactions && dividedCount > 0 && (
          <button
            type="button"
            className="cursor-pointer text-left text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
            onClick={onViewDividedTransactions}
          >
            Ver {dividedCount === 1 ? 'compra dividida' : `${dividedCount} compras divididas`}
          </button>
        )}

        {showCreditsSection && (
          <>
            <div className="my-2 border-t border-dashed border-slate-200" />
            {previousBalance > 0 && (
              <BridgeLine label="Saldo anterior" amount={previousBalance} />
            )}
            {invoiceCredits > 0 && (
              <div className="space-y-1">
                <button
                  type="button"
                  className="flex w-full items-baseline justify-between gap-4 text-left text-sm"
                  onClick={() => hasExpandableCredits && setCreditsExpanded(open => !open)}
                  disabled={!hasExpandableCredits}
                >
                  <span className="flex min-w-0 items-center gap-1 text-slate-600">
                    {hasExpandableCredits && (
                      <ChevronDown
                        className={cn(
                          'size-3.5 shrink-0 text-slate-400 transition-transform',
                          creditsExpanded && 'rotate-180'
                        )}
                      />
                    )}
                    <span>
                      <span className="text-slate-400">− </span>
                      Créditos e estornos
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-emerald-700">
                    − {formatCurrency(invoiceCredits)}
                  </span>
                </button>
                <p className="text-xs text-slate-500">
                  Estornos, IOF de volta e ajustes que reduzem o total da fatura.
                </p>
                {creditsExpanded && hasExpandableCredits && (
                  <div className="space-y-1 border-l-2 border-emerald-200/80 pl-3">
                    {creditLines.map(line => (
                      <BridgeLine
                        key={`${line.title}-${line.amount}`}
                        label={line.title}
                        amount={line.amount}
                        deduction
                      />
                    ))}
                    {unlistedCredits > 0 && (
                      <div
                        className={cn(
                          'space-y-0.5',
                          unlistedCreditsCopy.emphasis &&
                            'rounded-md border border-emerald-200/80 bg-emerald-50/60 px-2 py-1.5'
                        )}
                      >
                        <BridgeLine
                          label={unlistedCreditsCopy.label}
                          amount={unlistedCredits}
                          deduction
                          subtotal={unlistedCreditsCopy.emphasis}
                          prefix={unlistedCreditsCopy.prefix}
                        />
                        <p className="text-xs leading-relaxed text-slate-500">
                          {unlistedCreditsCopy.hint}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {creditLines.length > 0 && onViewInvoiceCredits && (
                  <button
                    type="button"
                    className="cursor-pointer text-left text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                    onClick={onViewInvoiceCredits}
                  >
                    {creditLines.length === 1
                      ? 'Ver crédito na fatura'
                      : `Ver ${creditLines.length} créditos na fatura`}
                  </button>
                )}
              </div>
            )}
            {invoiceCharges > 0 && (
              <BridgeLine label="Encargos na fatura" amount={invoiceCharges} />
            )}
            <BridgeLine label="Total da fatura" amount={invoiceTotal} emphasis prefix="=" />

            {paymentTotal > 0 && (
              <div className="mt-2 space-y-1 border-t border-dashed border-slate-200 pt-2">
                <button
                  type="button"
                  className="flex w-full items-baseline justify-between gap-4 text-left text-sm"
                  onClick={() => paymentLines.length > 0 && setPaymentsExpanded(open => !open)}
                  disabled={paymentLines.length === 0}
                >
                  <span className="flex min-w-0 items-center gap-1 text-slate-600">
                    {paymentLines.length > 0 && (
                      <ChevronDown
                        className={cn(
                          'size-3.5 shrink-0 text-slate-400 transition-transform',
                          paymentsExpanded && 'rotate-180'
                        )}
                      />
                    )}
                    <span>Pagamentos na fatura</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-blue-700">
                    {formatCurrency(paymentTotal)}
                  </span>
                </button>
                <p className="text-xs text-slate-500">
                  Valores que você pagou ao cartão. Não são estornos — reduzem o que ainda falta
                  pagar, mas não entram no cálculo acima.
                </p>
                {paymentsExpanded && paymentLines.length > 0 && (
                  <div className="space-y-1 border-l-2 border-blue-200/80 pl-3">
                    {paymentLines.map(line => (
                      <BridgeLine
                        key={`${line.title}-${line.amount}`}
                        label={line.title}
                        amount={line.amount}
                      />
                    ))}
                  </div>
                )}
                {onViewInvoicePayments && (
                  <button
                    type="button"
                    className="cursor-pointer text-left text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                    onClick={onViewInvoicePayments}
                  >
                    {paymentLines.length === 1
                      ? 'Ver pagamento na fatura'
                      : `Ver ${paymentLines.length} pagamentos na fatura`}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {!showCreditsSection && (
          <BridgeLine label="Total da fatura" amount={invoiceTotal} emphasis prefix="=" />
        )}
      </div>

      <p className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
        Use o filtro abaixo para alternar entre todas as compras e seu gasto líquido.
      </p>
    </div>
  )
}

export function CreditCardAnalyticsSection({
  accountId,
  accountName,
  cycle,
  closingDay,
  dueDay,
  onNavigateToMonth,
  onViewDividedTransactions,
  onViewInvoiceCredits,
  onViewInvoicePayments,
}: CreditCardAnalyticsSectionProps) {
  const { slug } = useActiveOrganization()
  const openAnalyticsGroupDrawer = useDrawerStore(s => s.openAnalyticsGroupDrawer)
  const [merchantQuickFilter, setMerchantQuickFilter] = useState<MerchantQuickFilter>('all')
  const [dividedOnly, setDividedOnly] = useState(false)
  const [spendingView, setSpendingView] = useState<AnalyticsSpendingView>('all')
  const showPersonal = spendingView === 'personal'
  const {
    purchasesPeriod,
    paymentPeriod,
    metrics,
    matchedStatement,
    isPending,
    reportScope,
    foreignStatements,
    cycleTransactions,
  } = useCreditCardInvoiceMetrics(accountId, cycle, closingDay, dueDay)

  const cycleTransactionIds = useMemo(
    () => cycleTransactions.map(transaction => transaction.id),
    [cycleTransactions]
  )
  const { data: splitData } = useSplitTransactionIds(slug, cycleTransactionIds)
  const dividedTransactionIds = splitData?.transactionIds ?? new Set<string>()
  const fullyDelegatedById = splitData?.fullyDelegatedById ?? new Map<string, string>()
  const fullyDelegatedCount = splitData?.fullyDelegatedCount ?? 0
  const partiallyDividedById = splitData?.partiallyDividedById ?? new Map<string, string>()
  const dividedCount = useMemo(
    () => cycleTransactions.filter(transaction => dividedTransactionIds.has(transaction.id)).length,
    [cycleTransactions, dividedTransactionIds]
  )

  const hasImportedInvoice = hasImportedInvoiceTotal(matchedStatement)
  const suggestedForeignMonthKey = foreignStatements[0]
    ? resolveStatementViewMonthKey(foreignStatements[0], closingDay, dueDay)
    : null

  const dateFrom = dayjs(purchasesPeriod.start).startOf('day').toISOString()
  const dateTo = dayjs(purchasesPeriod.end).endOf('day').toISOString()
  const purchasesLabel = metrics.usesImportedStatementPeriod
    ? formatImportedPurchasePeriodRange(purchasesPeriod.start, purchasesPeriod.end)
    : formatDateRange(cycle.periodStart, cycle.periodEnd)

  const reportParams = {
    dateFrom,
    dateTo,
    accountId,
    scope: 'credit_card' as const,
    ...reportScope,
  }

  const byCategoryAll = useGetReportByCategory(
    slug,
    { ...reportParams, type: 'expense' },
    { query: { enabled: !!slug && !!accountId } }
  )
  const byCategoryPersonal = useGetReportByCategory(
    slug,
    { ...reportParams, type: 'expense', personal: true },
    { query: { enabled: !!slug && !!accountId } }
  )
  const topMerchantsAll = useGetReportTopMerchants(
    slug,
    { ...reportParams, limit: MERCHANT_FETCH_LIMIT },
    { query: { enabled: !!slug && !!accountId } }
  )
  const topMerchantsPersonal = useGetReportTopMerchants(
    slug,
    { ...reportParams, personal: true, limit: MERCHANT_FETCH_LIMIT },
    { query: { enabled: !!slug && !!accountId } }
  )

  const byCategory = showPersonal ? byCategoryPersonal : byCategoryAll
  const topMerchants = showPersonal ? topMerchantsPersonal : topMerchantsAll

  const dividedExpenses = useMemo(
    () => filterDividedExpenseTransactions(cycleTransactions, dividedTransactionIds),
    [cycleTransactions, dividedTransactionIds]
  )

  const baseCategories = byCategory.data?.categories ?? []
  const baseMerchants = topMerchants.data?.merchants ?? []

  const dividedAnalytics = useMemo(() => {
    if (!dividedOnly) return null

    const categoryMeta = byCategoryAll.data?.categories ?? baseCategories
    const aggregatedCategories = aggregateCategoriesFromTransactions(
      dividedExpenses,
      categoryMeta
    )
    const aggregatedMerchants = aggregateMerchantsFromTransactions(
      dividedExpenses,
      fullyDelegatedById,
      partiallyDividedById
    )

    return {
      categories: aggregatedCategories,
      merchants: aggregatedMerchants.merchants,
      merchantCount: aggregatedMerchants.merchantCount,
      grandTotal: aggregatedMerchants.grandTotal,
    }
  }, [
    dividedOnly,
    dividedExpenses,
    byCategoryAll.data?.categories,
    baseCategories,
    fullyDelegatedById,
    partiallyDividedById,
  ])

  const isLoading =
    isPending ||
    byCategoryAll.isLoading ||
    byCategoryPersonal.isLoading ||
    topMerchantsAll.isLoading ||
    topMerchantsPersonal.isLoading
  const categories = dividedAnalytics?.categories ?? baseCategories
  const allMerchants = dividedAnalytics?.merchants ?? baseMerchants
  const merchantCount =
    dividedAnalytics?.merchantCount ??
    topMerchants.data?.merchantCount ??
    allMerchants.length
  const grandTotal = dividedAnalytics?.grandTotal ?? topMerchants.data?.grandTotal ?? '0'
  const mySpend = moneyStringToReais(topMerchantsPersonal.data?.grandTotal ?? '0')
  const allPurchasesTotal = moneyStringToReais(topMerchantsAll.data?.grandTotal ?? '0')
  const chartSpendTotal = moneyStringToReais(grandTotal)
  const invoiceTotal = metrics.invoiceTotal
  const invoicePurchases = metrics.purchases
  const amountReconciliation = computeInvoiceAmountReconciliation({
    purchases: invoicePurchases,
    previousBalance: metrics.previousBalance,
    invoiceTotal,
  })
  const splitAdjustment = computePersonalSpendAdjustment(invoicePurchases, mySpend)
  const adjustmentPeriod = useMemo(
    () => ({ start: purchasesPeriod.start, end: paymentPeriod.end }),
    [purchasesPeriod.start, paymentPeriod.end]
  )
  const creditLines = useMemo(
    () =>
      listInvoiceAdjustmentCredits(
        cycleTransactions,
        adjustmentPeriod,
        cycle,
        matchedStatement
      ),
    [cycleTransactions, adjustmentPeriod, cycle, matchedStatement]
  )
  const paymentLines = useMemo(
    () =>
      listInvoiceBillPayments(
        cycleTransactions,
        purchasesPeriod,
        paymentPeriod,
        cycle,
        matchedStatement
      ),
    [cycleTransactions, purchasesPeriod, paymentPeriod, cycle, matchedStatement]
  )
  const paymentTotal = useMemo(
    () => paymentLines.reduce((sum, line) => sum + line.amount, 0),
    [paymentLines]
  )
  const amountsDiffer =
    hasImportedInvoice &&
    reaisToCents(invoiceTotal) !== reaisToCents(mySpend) &&
    mySpend > 0
  const showNoInvoiceNotice =
    !hasImportedInvoice && (mySpend > 0 || foreignStatements.length > 0)
  const showAmountReconciliation =
    amountsDiffer && invoicePurchases > 0 && !showNoInvoiceNotice

  const breakdownNote = suggestedForeignMonthKey
    ? `Não há fatura importada neste ciclo. Compras importadas deste período estão na ${formatInvoiceLabel(suggestedForeignMonthKey).toLowerCase()}.`
    : 'Não há fatura importada neste ciclo. Suas compras aqui podem constar na fatura de outro mês.'
  const categorySectionHint = dividedOnly
    ? `Compras divididas ou delegadas por categoria · toque para ver`
    : showPersonal
      ? 'Seu gasto líquido após divisões · toque para ver'
      : 'Todas as compras do período da fatura · toque para ver'
  const merchantSectionHint = dividedOnly
    ? `Top ${TOP_MERCHANTS_LIMIT} em compras divididas ou delegadas · toque para ver`
    : showPersonal
      ? `Top ${TOP_MERCHANTS_LIMIT} por gasto pessoal · agrupados pelo nome na fatura · toque para ver`
      : `Top ${TOP_MERCHANTS_LIMIT} por valor · agrupados pelo nome na fatura · toque para ver`

  const fullyDelegatedAmount = useMemo(
    () =>
      cycleTransactions
        .filter(transaction => fullyDelegatedById.has(transaction.id))
        .reduce((sum, transaction) => sum + moneyStringToReais(transaction.amount), 0),
    [cycleTransactions, fullyDelegatedById]
  )
  const partialSplitAdjustment = Math.max(0, splitAdjustment - fullyDelegatedAmount)

  const recurringMerchants = useMemo(
    () => allMerchants.filter(merchant => merchant.isRecurring),
    [allMerchants]
  )
  const singleMerchants = useMemo(
    () => allMerchants.filter(merchant => !merchant.isRecurring && !merchant.hasInstallments),
    [allMerchants]
  )
  const installmentMerchants = useMemo(
    () => allMerchants.filter(merchant => merchant.hasInstallments),
    [allMerchants]
  )
  const recurringCount = recurringMerchants.length

  const merchantFilterCounts = useMemo(
    () => ({
      all: Math.min(allMerchants.length, TOP_MERCHANTS_LIMIT),
      recurring: recurringMerchants.length,
      installments: installmentMerchants.length,
      single: singleMerchants.length,
    }),
    [
      allMerchants.length,
      recurringMerchants.length,
      installmentMerchants.length,
      singleMerchants.length,
    ]
  )

  const visibleMerchants = useMemo(() => {
    switch (merchantQuickFilter) {
      case 'recurring':
        return recurringMerchants
      case 'installments':
        return installmentMerchants
      case 'single':
        return singleMerchants.slice(0, TOP_MERCHANTS_LIMIT)
      default:
        return allMerchants.slice(0, TOP_MERCHANTS_LIMIT)
    }
  }, [allMerchants, merchantQuickFilter, installmentMerchants, recurringMerchants, singleMerchants])

  const merchantQuickFilterOptions = useMemo(
    () =>
      MERCHANT_QUICK_FILTERS.map(filter => ({
        ...filter,
        count: merchantFilterCounts[filter.id],
      })),
    [merchantFilterCounts]
  )

  const merchantEmptyMessage = dividedOnly
    ? 'Nenhuma compra dividida ou delegada nesta fatura'
    : merchantQuickFilter === 'recurring'
      ? 'Nenhum estabelecimento recorrente nesta fatura'
      : merchantQuickFilter === 'installments'
        ? 'Nenhuma compra parcelada nesta fatura'
        : merchantQuickFilter === 'single'
          ? 'Nenhuma compra avulsa nesta fatura'
          : 'Nenhuma compra nesta fatura'

  const toggleDividedFilter = () => {
    if (dividedCount === 0) return
    setDividedOnly(current => !current)
    setMerchantQuickFilter('all')
  }

  const chartData = mapCategoryToChartData(categories)

  const openGroup = (item: ExpenseRankingItem, groupType: AnalyticsGroupContext['groupType']) => {
    window.requestAnimationFrame(() => {
      openAnalyticsGroupDrawer({
        accountId,
        accountName,
        cycleLabel: cycle.label,
        purchasesLabel,
        purchasesPeriod,
        groupType,
        groupKey: item.id,
        label: item.label,
        total: item.total,
        occurrenceCount: item.occurrenceCount,
        color: groupType === 'category' ? item.color : undefined,
      })
    })
  }

  if (isLoading) {
    return <CreditCardAnalyticsSkeleton />
  }

  return (
    <div className="space-y-4 px-4 py-3 lg:px-6">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-50/40 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-violet-600" />
            <span className="text-sm font-medium text-slate-700">Análise da fatura</span>
          </div>

          <DualMetricsHero
            mySpend={mySpend}
            invoiceTotal={invoiceTotal}
            hasImportedInvoice={hasImportedInvoice}
            invoiceCredits={amountReconciliation.invoiceCredits}
            invoicePayments={paymentTotal}
          />

          {showAmountReconciliation && (
            <InvoiceBridgeBreakdown
              purchases={amountReconciliation.purchases}
              previousBalance={amountReconciliation.previousBalance}
              invoiceCredits={amountReconciliation.invoiceCredits}
              invoiceCharges={amountReconciliation.invoiceCharges}
              creditLines={creditLines}
              paymentLines={paymentLines}
              splitAdjustment={splitAdjustment}
              mySpend={mySpend}
              invoiceTotal={invoiceTotal}
              dividedCount={dividedCount}
              onViewDividedTransactions={onViewDividedTransactions}
              onViewInvoiceCredits={onViewInvoiceCredits}
              onViewInvoicePayments={onViewInvoicePayments}
            />
          )}

          {splitAdjustment > 0 && !showAmountReconciliation && onViewDividedTransactions && dividedCount > 0 && (
            <div className="mt-5 flex gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-700">
              <Info className="mt-0.5 size-4 shrink-0 text-slate-500" />
              <div className="space-y-1">
                {fullyDelegatedCount > 0 && (
                  <p>
                    {fullyDelegatedCount === 1 ? '1 compra delegada' : `${fullyDelegatedCount} compras delegadas`}
                    {fullyDelegatedAmount > 0 && (
                      <>
                        {' '}
                        (
                        <span className="font-medium tabular-nums">
                          {formatCurrency(fullyDelegatedAmount)}
                        </span>
                        )
                      </>
                    )}
                    {' '}
                    — não entra no seu gasto.
                  </p>
                )}
                {partialSplitAdjustment > 0 && (
                  <p>
                    Parte das compras foi dividida com outras pessoas (
                    <span className="font-medium tabular-nums">
                      {formatCurrency(partialSplitAdjustment)}
                    </span>
                    ).
                  </p>
                )}
                <button
                  type="button"
                  className="cursor-pointer font-medium text-slate-700 underline-offset-2 hover:underline"
                  onClick={onViewDividedTransactions}
                >
                  Ver {dividedCount === 1 ? 'compra dividida' : `${dividedCount} compras divididas`}
                </button>
              </div>
            </div>
          )}

          {showNoInvoiceNotice && (
            <div className="mt-5 flex gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-700">
              <Info className="mt-0.5 size-4 shrink-0 text-slate-500" />
              <div className="space-y-2">
                <p>{breakdownNote}</p>
                {suggestedForeignMonthKey && onNavigateToMonth && (
                  <button
                    type="button"
                    className="cursor-pointer font-medium text-slate-700 underline-offset-2 hover:underline"
                    onClick={() => onNavigateToMonth(suggestedForeignMonthKey)}
                  >
                    Ver {formatInvoiceLabel(suggestedForeignMonthKey).toLowerCase()}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span>{accountName}</span>
            <span className="hidden text-slate-300 sm:inline">·</span>
            <span>Fatura de {cycle.label}</span>
            <span className="hidden text-slate-300 sm:inline">·</span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" />
              Compras {purchasesLabel}
            </span>
            {matchedStatement?.closingDate && matchedStatement?.dueDate && (
              <>
                <span className="hidden text-slate-300 sm:inline">·</span>
                <span>
                  Fech. {dayjs(matchedStatement.closingDate).format('DD/MM/YYYY')} · Venc.{' '}
                  {dayjs(matchedStatement.dueDate).format('DD/MM/YYYY')}
                </span>
              </>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <AnalyticsStat
              icon={Tag}
              label="Categorias"
              value={String(categories.length)}
              iconClass="text-violet-500"
            />
            <AnalyticsStat
              icon={Store}
              label="Estabelecimentos"
              value={String(merchantCount)}
              iconClass="text-blue-500"
              onClick={() => {
                setDividedOnly(false)
                setMerchantQuickFilter('all')
              }}
              isActive={!dividedOnly && merchantQuickFilter === 'all'}
            />
            <AnalyticsStat
              icon={Repeat}
              label="Recorrentes"
              value={String(recurringCount)}
              iconClass="text-amber-500"
              onClick={() => {
                setDividedOnly(false)
                setMerchantQuickFilter('recurring')
              }}
              isActive={!dividedOnly && merchantQuickFilter === 'recurring'}
            />
            <AnalyticsStat
              icon={Share2}
              label="Divididos"
              value={String(dividedCount)}
              iconClass="text-rose-500"
              onClick={dividedCount > 0 ? toggleDividedFilter : undefined}
              isActive={dividedOnly}
            />
            <AnalyticsStat
              icon={BarChart3}
              label="Ticket médio"
              value={
                merchantCount > 0 && chartSpendTotal > 0
                  ? formatCurrency(chartSpendTotal / merchantCount)
                  : '—'
              }
              iconClass="text-emerald-500"
            />
          </div>

          <AnalyticsSpendingToggle
            value={spendingView}
            allTotal={allPurchasesTotal}
            personalTotal={mySpend}
            onChange={nextView => {
              setSpendingView(nextView)
              if (dividedOnly) setDividedOnly(false)
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="finance-card">
          <CardHeader>
            <CardTitle className="text-base">Gastos por categoria</CardTitle>
            <p className="text-sm text-slate-500">{categorySectionHint}</p>
          </CardHeader>
          <CardContent>
            {byCategory.error ? (
              <AnalyticsError message="Não foi possível carregar as categorias" />
            ) : categories.length === 0 ? (
              <AnalyticsError
                message={
                  dividedOnly
                    ? 'Nenhuma compra dividida ou delegada nesta fatura'
                    : 'Nenhuma compra categorizada nesta fatura'
                }
              />
            ) : (
              <div className="space-y-4">
                <CategoryBreakdownChart data={chartData} compact />
                <div className="border-t border-slate-100 pt-2">
                  <ExpenseRankingList
                    items={categories.map(category => ({
                      id: category.categoryId,
                      label: category.name,
                      total: category.total,
                      percentage: category.percentage,
                      color: category.color,
                    }))}
                    grandTotal={grandTotal}
                    emptyMessage="Nenhuma compra categorizada nesta fatura"
                    onItemClick={item => openGroup(item, 'category')}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="finance-card">
          <CardHeader className="space-y-3">
            <div>
              <CardTitle className="text-base">Maiores estabelecimentos</CardTitle>
              <p className="text-sm text-slate-500">{merchantSectionHint}</p>
            </div>
            <QuickFilterBadges
              value={merchantQuickFilter}
              options={merchantQuickFilterOptions}
              onChange={nextFilter => {
                setDividedOnly(false)
                setMerchantQuickFilter(nextFilter)
              }}
            />
          </CardHeader>
          <CardContent>
            {topMerchants.error ? (
              <AnalyticsError message="Não foi possível carregar os estabelecimentos" />
            ) : (
              <ExpenseRankingList
                showRank
                items={visibleMerchants.map(merchant => ({
                  id: merchant.key,
                  label: merchant.label,
                  total: merchant.total,
                  percentage: merchant.percentage,
                  isRecurring: merchant.isRecurring,
                  occurrenceCount: merchant.occurrenceCount,
                  delegatedToName:
                    !showPersonal && merchant.hasFullyDelegated
                      ? merchant.delegatedToName
                      : undefined,
                  dividedWithName:
                    !showPersonal && merchant.hasDivided
                      ? merchant.dividedWithName
                      : undefined,
                  subtitle: formatMerchantSubtitle(
                    merchant.occurrenceCount,
                    merchant.avgAmount,
                    merchant.lastDate
                  ),
                }))}
                grandTotal={grandTotal}
                emptyMessage={merchantEmptyMessage}
                onItemClick={item => openGroup(item, 'merchant')}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
