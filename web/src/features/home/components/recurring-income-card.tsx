import type { ListRecurringTransactions200RecurringTransactionsItem } from '@/api/generated/model'
import { TrendingUp } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, moneyStringToReais } from '@/lib/currency'
import { useDrawerStore } from '@/stores/drawers'

interface RecurringIncomeCardProps {
  recurring?: ListRecurringTransactions200RecurringTransactionsItem[]
  isLoading?: boolean
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

export function RecurringIncomeCard({ recurring = [], isLoading }: RecurringIncomeCardProps) {
  const openRecurringContractDrawer = useDrawerStore(s => s.openRecurringContractDrawer)
  const incomes = recurring.filter(item => item.type === 'income' && item.isActive)
  const monthlyTotal = incomes.reduce(
    (sum, item) =>
      sum + monthlyEquivalent(moneyStringToReais(item.amount), item.frequency, item.interval),
    0
  )

  return (
    <Card className="finance-card">
      <CardHeader className="flex flex-row items-center gap-2">
        <TrendingUp className="size-4 text-emerald-600" />
        <CardTitle className="text-base">Receitas recorrentes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold tabular-nums text-emerald-700">
              {formatCurrency(monthlyTotal)}
              <span className="text-sm font-normal text-slate-500">/mês</span>
            </p>
            {incomes.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">Nenhuma receita recorrente ativa</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {incomes.slice(0, 4).map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-sm hover:bg-slate-50"
                      onClick={() => openRecurringContractDrawer(item.id)}
                    >
                      <span className="truncate font-medium text-slate-800">{item.title}</span>
                      <span className="shrink-0 tabular-nums text-emerald-700">
                        {formatCurrency(moneyStringToReais(item.amount))}
                      </span>
                    </button>
                  </li>
                ))}
                {incomes.length > 4 && (
                  <p className="text-xs text-slate-500">+{incomes.length - 4} contrato(s)</p>
                )}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
