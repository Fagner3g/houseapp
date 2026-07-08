import { formatCurrency } from '@/lib/currency'
import type { KpiDialogView, KpiKey, KpiSummaryItem } from './types'

export function buildKpiDialogByKey(input: {
  kpis: {
    myPaid: number
    myPendingSplits: number
    pendingExpense: number
    pendingIncome: number
  }
  overdueCount: number
  paidExpenseItems: KpiSummaryItem[]
  splitItems: KpiSummaryItem[]
  toPayItems: KpiSummaryItem[]
  toReceiveItems: KpiSummaryItem[]
  overdueItems: KpiSummaryItem[]
  splitsLoading: boolean
  overdueLoading: boolean
}): Record<KpiKey, KpiDialogView> {
  const { kpis, overdueCount } = input

  return {
    mySpend: {
      title: 'Meu gasto',
      description:
        'É o que ficou com você no período: despesas pagas menos a fatia de quem divide a conta. Essa fatia já sai daqui mesmo se a pessoa ainda não te pagou — o que falta voltar aparece em Splits a receber.',
      totalLabel: 'Seu custo no período',
      total: formatCurrency(kpis.myPaid),
      items: input.paidExpenseItems,
      emptyMessage: 'Nenhuma despesa paga no período.',
      footerHint: 'Toque em um item para abrir o lançamento',
    },
    pendingSplits: {
      title: 'Splits a receber',
      description:
        'Dinheiro que outras pessoas ainda te devem em divisões. Já foi retirado de Meu gasto; aqui é só o que falta entrar. Não segue o filtro de período da lista.',
      totalLabel: 'Total em aberto',
      total: formatCurrency(kpis.myPendingSplits),
      totalClassName: 'text-amber-700',
      items: input.splitItems,
      isLoading: input.splitsLoading,
      emptyMessage: 'Nenhum split pendente.',
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
