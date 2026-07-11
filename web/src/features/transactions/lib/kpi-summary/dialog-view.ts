import { formatCurrency } from '@/lib/currency'
import type { KpiDialogView, KpiKey, KpiSummaryItem } from './types'

export function buildKpiDialogByKey(input: {
  kpis: {
    myPaid: number
    myExpenseGross: number
    mySplitsInPeriod: number
    myPendingSplits: number
    myPendingSplitsInPeriod: number
    pendingExpense: number
    pendingIncome: number
  }
  overdueCount: number
  mySpendItems: KpiSummaryItem[]
  splitItems: KpiSummaryItem[]
  splitSecondaryItems: KpiSummaryItem[]
  toPayItems: KpiSummaryItem[]
  toReceiveItems: KpiSummaryItem[]
  overdueItems: KpiSummaryItem[]
  mySpendLoading: boolean
  splitsLoading: boolean
  overdueLoading: boolean
}): Record<KpiKey, KpiDialogView> {
  const { kpis, overdueCount } = input
  const showMySpendBreakdown = kpis.mySplitsInPeriod > 0
  const showPendingSplitsBreakdown = kpis.myPendingSplits > kpis.myPendingSplitsInPeriod

  return {
    mySpend: {
      title: 'Meu gasto',
      description:
        'Faturas dos seus cartões e despesas em conta, menos o que você repassou em splits. O valor de cada linha já é o que ficou com você.',
      totalLabel: 'Seu custo no período',
      total: formatCurrency(kpis.myPaid),
      breakdown: showMySpendBreakdown
        ? [
            {
              label: 'Faturas e despesas',
              value: formatCurrency(kpis.myExpenseGross),
            },
            {
              label: 'Menos splits repassados',
              value: formatCurrency(kpis.mySplitsInPeriod),
              prefix: '−',
              className: 'text-amber-700',
            },
            {
              label: 'Seu custo no período',
              value: formatCurrency(kpis.myPaid),
              emphasis: true,
            },
          ]
        : undefined,
      items: input.mySpendItems,
      isLoading: input.mySpendLoading,
      emptyMessage: 'Nenhuma fatura ou despesa sua no período.',
      footerHint: 'Toque em um item para abrir',
    },
    pendingSplits: {
      title: 'Splits a receber',
      description:
        'Dinheiro que outras pessoas ainda te devem em divisões neste período. Já foi retirado de Meu gasto; aqui é só o que falta entrar.',
      totalLabel: 'No período',
      total: formatCurrency(kpis.myPendingSplitsInPeriod),
      totalClassName: 'text-amber-700',
      breakdown: showPendingSplitsBreakdown
        ? [
            {
              label: 'No período',
              value: formatCurrency(kpis.myPendingSplitsInPeriod),
              emphasis: true,
              className: 'text-amber-700',
            },
            {
              label: 'Total em aberto',
              value: formatCurrency(kpis.myPendingSplits),
            },
          ]
        : undefined,
      items: input.splitItems,
      secondaryItemsLabel:
        input.splitSecondaryItems.length > 0 ? 'Em aberto fora do período' : undefined,
      secondaryItems: input.splitSecondaryItems,
      isLoading: input.splitsLoading,
      emptyMessage: 'Nenhum split pendente no período.',
      footerHint: 'Toque na pessoa para ver os lançamentos · toque no lançamento para abrir',
    },
    toPay: {
      title: 'A pagar',
      description: 'Despesas e faturas de cartão ainda pendentes no período selecionado.',
      totalLabel: 'Total a pagar',
      total: formatCurrency(kpis.pendingExpense),
      totalClassName: 'text-amber-700',
      items: input.toPayItems,
      emptyMessage: 'Nada pendente no período.',
      footerHint: 'Toque em um item para abrir',
    },
    toReceive: {
      title: 'A receber',
      description: 'Receitas previstas no período que ainda não foram confirmadas como recebidas.',
      totalLabel: 'Total a receber',
      total: formatCurrency(kpis.pendingIncome),
      totalClassName: 'text-emerald-700',
      items: input.toReceiveItems,
      emptyMessage: 'Nenhuma receita pendente no período.',
      footerHint: 'Toque em um item para abrir o lançamento',
    },
    overdue: {
      title: 'Vencidos',
      description:
        'Lançamentos pagáveis com data anterior a hoje. Contagem global, sem filtro de período.',
      totalLabel: 'Quantidade',
      total: String(overdueCount),
      totalClassName: 'text-rose-700',
      items: input.overdueItems,
      isLoading: input.overdueLoading,
      emptyMessage: 'Nenhum lançamento vencido.',
      footerHint:
        overdueCount > input.overdueItems.length
          ? `Mostrando ${input.overdueItems.length} de ${overdueCount} · toque para abrir`
          : 'Toque em um item para abrir o lançamento',
    },
  }
}
