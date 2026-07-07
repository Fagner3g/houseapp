import type { ListRecurringTransactions200RecurringTransactionsItem } from '@/api/generated/model'
import { RefreshCw } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, moneyStringToReais } from '@/lib/currency'

interface RecurringCostCardProps {
  recurring?: ListRecurringTransactions200RecurringTransactionsItem[]
}

function monthlyEquivalent(
  amount: number,
  frequency: string,
  interval: number
): number {
  const safeInterval = Math.max(interval, 1)
  switch (frequency) {
    case 'daily':
      return amount * (30 / safeInterval)
    case 'weekly':
      return amount * (4 / safeInterval)
    case 'monthly':
      return amount / safeInterval
    case 'yearly':
      return amount / (12 * safeInterval)
    default:
      return amount
  }
}

export function RecurringCostCard({ recurring = [] }: RecurringCostCardProps) {
  const expenses = recurring.filter(r => r.type === 'expense' && r.isActive)
  const monthlyTotal = expenses.reduce(
    (sum, r) =>
      sum + monthlyEquivalent(moneyStringToReais(r.amount), r.frequency, r.interval),
    0
  )

  return (
    <Card className="finance-card">
      <CardHeader className="flex flex-row items-center gap-2">
        <RefreshCw className="size-4 text-slate-500" />
        <CardTitle className="text-base">Custos fixos</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums text-slate-900">
          {formatCurrency(monthlyTotal)}
          <span className="text-sm font-normal text-slate-500">/mês</span>
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {expenses.length === 0
            ? 'Nenhuma despesa recorrente ativa'
            : `${expenses.length} despesa(s) recorrente(s) ativa(s)`}
        </p>
      </CardContent>
    </Card>
  )
}
