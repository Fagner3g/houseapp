import dayjs from 'dayjs'
import { useMemo } from 'react'

import type { BillingCycle } from '@/lib/billing-cycle'
import { formatDateRange, formatImportedPurchasePeriodRange } from '@/lib/billing-cycle'
import { formatCurrency } from '@/lib/currency'
import { useActiveOrganization } from '@/hooks/use-active-organization'

import { useCreditCardInvoiceMetrics } from '../hooks/use-credit-card-invoice-metrics'
import { useSplitTransactionIds } from '../hooks/use-split-transaction-ids'
import { resolveDebtorInvoiceHero } from '../lib/debtor-invoice-hero'
import {
  sumCycleSplitRemaining,
  sumCycleViewerShareAmount,
  sumCycleViewerShareRemaining,
} from '../lib/cycle-split-remaining'

export function useCreditCardKpiHero(
  accountId: string,
  cycle: BillingCycle,
  closingDay: number,
  dueDay: number,
  canManage = true
) {
  const { slug } = useActiveOrganization()
  const isDebtorView = canManage === false

  const {
    metrics,
    matchedStatement,
    purchasesPeriod,
    dueDate,
    isPaid: bankIsPaid,
    isSettledEmpty: bankIsSettledEmpty,
    isOverdue: bankIsOverdue,
    isPending,
    cycleTransactions,
  } = useCreditCardInvoiceMetrics(accountId, cycle, closingDay, dueDay)

  const transactionIds = useMemo(
    () => cycleTransactions.map(transaction => transaction.id),
    [cycleTransactions]
  )
  const { data: splitData } = useSplitTransactionIds(slug, transactionIds)

  const pendingSplitRemaining = useMemo(
    () =>
      sumCycleSplitRemaining(
        transactionIds,
        splitData?.receivableRemainingById ?? new Map()
      ),
    [transactionIds, splitData?.receivableRemainingById]
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

  const isPaid = debtorHero?.isPaid ?? bankIsPaid
  const isSettledEmpty = debtorHero?.isSettledEmpty ?? bankIsSettledEmpty
  const isOverdue = debtorHero?.isOverdue ?? bankIsOverdue

  const isInvoiceClosed =
    matchedStatement?.isClosed === true ||
    !dayjs(cycle.closingDate).startOf('day').isAfter(dayjs().startOf('day'))

  const purchasesLabel = metrics.usesImportedStatementPeriod
    ? formatImportedPurchasePeriodRange(purchasesPeriod.start, purchasesPeriod.end)
    : formatDateRange(cycle.periodStart, cycle.periodEnd)

  const supportsManualPayment =
    !isDebtorView &&
    matchedStatement?.importSource !== 'ofx' &&
    matchedStatement?.importSource !== 'xlsx'

  const heroAmount =
    debtorHero?.heroAmount ??
    (isPaid ? metrics.invoiceTotal : isSettledEmpty ? 0 : metrics.remaining)

  const invoiceTotalLabel = formatCurrency(metrics.invoiceTotal)
  const heroSubtitle = isDebtorView
    ? isPaid
      ? 'Sua parte nesta fatura'
      : isOverdue
        ? 'Sua parte em aberto'
        : isSettledEmpty
          ? 'Sem lançamentos neste ciclo'
          : 'Sua parte nesta fatura'
    : isPaid
      ? metrics.payments >= metrics.invoiceTotal
        ? 'Pago integralmente'
        : 'Saldo em aberto: R$ 0,00'
      : !isSettledEmpty && metrics.payments > 0
        ? `de ${invoiceTotalLabel} no total da fatura`
        : isSettledEmpty
          ? 'Sem lançamentos neste ciclo'
          : null

  const showBreakdown =
    !isDebtorView &&
    (metrics.purchases > 0 ||
      metrics.previousBalance > 0 ||
      metrics.payments > 0 ||
      metrics.invoiceTotal > 0 ||
      pendingSplitRemaining > 0)

  const paidLabel = isDebtorView ? 'Sua parte quitada' : 'Fatura quitada'
  const paidCaption = isDebtorView ? 'Sua parte' : 'Total da fatura'

  return {
    metrics,
    dueDate,
    isPending,
    isPaid,
    isSettledEmpty,
    isOverdue,
    isDebtorView,
    isInvoiceClosed,
    purchasesLabel,
    supportsManualPayment,
    heroAmount,
    heroSubtitle,
    showBreakdown,
    pendingSplitRemaining,
    paidLabel,
    paidCaption,
    bankRemaining: metrics.remaining,
  }
}
