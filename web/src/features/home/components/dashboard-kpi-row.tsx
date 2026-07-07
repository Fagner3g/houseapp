import type { GetReportSummary200 } from '@/api/generated/model'
import {
  AlertCircle,
  CircleMinus,
  CirclePlus,
  HandCoins,
  PiggyBank,
  Wallet,
} from 'lucide-react'

import { formatCurrency, moneyStringToReais } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { computeDeltaPercent, formatDeltaPercent } from '../lib/chart-mappers'

interface DashboardKpiRowProps {
  summary: GetReportSummary200
  previousSummary?: GetReportSummary200
}

export function DashboardKpiRow({ summary, previousSummary }: DashboardKpiRowProps) {
  const income = moneyStringToReais(summary.totalIncome)
  const expense = moneyStringToReais(summary.totalExpense)
  const myExpense = moneyStringToReais(summary.myExpenseTotal)
  const myPendingSplits = moneyStringToReais(summary.myPendingSplitsTotal)
  const balance = income - myExpense
  const netWorth = moneyStringToReais(summary.netWorth)
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
      subtitle:
        expense > myExpense
          ? `${formatCurrency(expense)} total da casa`
          : 'Despesas pagas no período',
      icon: CircleMinus,
      iconClass: 'text-rose-500',
      valueClass: 'text-slate-900',
    },
    {
      label: 'A receber',
      value: formatCurrency(myPendingSplits),
      subtitle: 'Splits pendentes de outras pessoas',
      icon: HandCoins,
      iconClass: 'text-amber-500',
      valueClass: myPendingSplits > 0 ? 'text-amber-600' : 'text-slate-900',
    },
    {
      label: 'Saldo do mês',
      value: formatCurrency(balance),
      delta: savingsRate != null ? `${savingsRate.toFixed(0)}% poupança` : undefined,
      subtitle: balance >= 0 ? 'Receitas − meu gasto' : 'Gastou mais do que recebeu',
      icon: PiggyBank,
      iconClass: balance >= 0 ? 'text-emerald-500' : 'text-rose-500',
      valueClass: balance >= 0 ? 'text-emerald-700' : 'text-rose-600',
    },
    {
      label: 'Patrimônio',
      value: formatCurrency(netWorth),
      subtitle: 'Saldo total das contas',
      icon: Wallet,
      iconClass: 'text-blue-500',
      valueClass: 'text-slate-900',
    },
    {
      label: 'Pendências',
      value: String(summary.pendingCount),
      subtitle:
        summary.overdueCount > 0
          ? `${summary.overdueCount} vencida(s)`
          : 'Lançamentos em aberto',
      icon: AlertCircle,
      iconClass: summary.overdueCount > 0 ? 'text-amber-500' : 'text-slate-400',
      valueClass: summary.overdueCount > 0 ? 'text-amber-600' : 'text-slate-900',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
