import type { GetReportSummary200 } from '@/api/generated/model'
import { CircleMinus, CirclePlus, Clock, PiggyBank } from 'lucide-react'

import { formatCurrency, moneyStringToReais } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { computeDeltaPercent, formatDeltaPercent } from '../lib/chart-mappers'

interface DashboardKpiRowProps {
  summary: GetReportSummary200
  previousSummary?: GetReportSummary200
  pendingExpense?: number
  cashFlowLoading?: boolean
}

function myExpenseSubtitle(params: {
  myExpense: number
  myExpenseGross: number
  mySplitsInPeriod: number
  houseExpense: number
}) {
  const { myExpense, myExpenseGross, mySplitsInPeriod, houseExpense } = params
  if (mySplitsInPeriod > 0) {
    return `Total ${formatCurrency(myExpenseGross)} · splits ${formatCurrency(mySplitsInPeriod)}`
  }
  if (houseExpense > myExpense) {
    return `${formatCurrency(houseExpense)} total da casa`
  }
  return 'Compras e despesas do período'
}

function toPaySubtitle(pendingSplitsInPeriod: number) {
  if (pendingSplitsInPeriod > 0) {
    return `Splits a receber ${formatCurrency(pendingSplitsInPeriod)}`
  }
  return 'Pendente no período'
}

export function DashboardKpiRow({
  summary,
  previousSummary,
  pendingExpense = 0,
  cashFlowLoading = false,
}: DashboardKpiRowProps) {
  const income = moneyStringToReais(summary.totalIncome)
  const houseExpense = moneyStringToReais(summary.totalExpense)
  const myExpense = moneyStringToReais(summary.myExpenseTotal)
  const myExpenseGross = moneyStringToReais(summary.myExpenseGrossTotal)
  const mySplitsInPeriod = moneyStringToReais(summary.mySplitsInPeriodTotal)
  const pendingSplitsInPeriod = moneyStringToReais(summary.myPendingSplitsInPeriodTotal)
  const balance = income - myExpense
  const savingsRate = income > 0 ? (balance / income) * 100 : null

  const prevIncome = moneyStringToReais(previousSummary?.totalIncome)
  const prevMyExpense = moneyStringToReais(previousSummary?.myExpenseTotal)

  const cards = [
    {
      label: 'Receitas',
      value: formatCurrency(income),
      delta: formatDeltaPercent(computeDeltaPercent(income, prevIncome)),
      subtitle: 'Pagas no período',
      icon: CirclePlus,
      iconClass: 'text-emerald-500',
      valueClass: 'text-slate-900',
    },
    {
      label: 'Meu gasto',
      value: formatCurrency(myExpense),
      delta: formatDeltaPercent(computeDeltaPercent(myExpense, prevMyExpense)),
      subtitle: myExpenseSubtitle({
        myExpense,
        myExpenseGross,
        mySplitsInPeriod,
        houseExpense,
      }),
      icon: CircleMinus,
      iconClass: 'text-rose-500',
      valueClass: 'text-slate-900',
    },
    {
      label: 'A pagar',
      value: cashFlowLoading ? '—' : formatCurrency(pendingExpense),
      subtitle: toPaySubtitle(pendingSplitsInPeriod),
      icon: Clock,
      iconClass: 'text-amber-500',
      valueClass: pendingExpense > 0 ? 'text-amber-600' : 'text-slate-900',
    },
    {
      label: 'Saldo do mês',
      value: formatCurrency(balance),
      delta: savingsRate != null ? `${savingsRate.toFixed(0)}% poupança` : undefined,
      subtitle:
        balance >= 0
          ? 'Receitas − meu gasto (líquido)'
          : 'Gastou mais do que recebeu (líquido)',
      icon: PiggyBank,
      iconClass: balance >= 0 ? 'text-emerald-500' : 'text-rose-500',
      valueClass: balance >= 0 ? 'text-emerald-700' : 'text-rose-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => (
        <div key={card.label} className="kpi-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <card.icon className={cn('size-4', card.iconClass)} />
              <span className="text-sm font-medium text-slate-600">{card.label}</span>
            </div>
            {card.delta && (
              <span className="text-xs font-medium text-slate-500">{card.delta}</span>
            )}
          </div>
          <p className={cn('text-2xl font-bold tabular-nums tracking-tight', card.valueClass)}>
            {card.value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
        </div>
      ))}
    </div>
  )
}
