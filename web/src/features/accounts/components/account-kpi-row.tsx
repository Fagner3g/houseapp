import dayjs from 'dayjs'
import { keepPreviousData } from '@tanstack/react-query'
import { CircleMinus, Clock } from 'lucide-react'
import { useMemo } from 'react'

import { useListTransactions } from '@/api/generated/api'
import { centsToReais, formatCurrency, moneyStringToCents } from '@/lib/currency'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { cn } from '@/lib/utils'

interface AccountKpiRowProps {
  accountId: string
  dateFrom: string
  dateTo: string
}

function sumAmountsCents(
  transactions: { amount?: string | null }[]
): number {
  return transactions.reduce((sum, tx) => sum + moneyStringToCents(tx.amount), 0)
}

export function AccountKpiRow({ accountId, dateFrom, dateTo }: AccountKpiRowProps) {
  const { slug } = useActiveOrganization()

  const dateFromIso = dayjs(dateFrom).startOf('day').toISOString()
  const dateToIso = dayjs(dateTo).endOf('day').toISOString()

  const { data } = useListTransactions(
    slug,
    {
      accountId,
      type: 'expense',
      dateFrom: dateFromIso,
      dateTo: dateToIso,
      payableOnly: true,
      perPage: 100,
    },
    { query: { enabled: !!slug && !!accountId, placeholderData: keepPreviousData } }
  )

  const metrics = useMemo(() => {
    const transactions = data?.transactions ?? []
    const pendingTransactions = transactions.filter(
      tx => tx.status === 'pending' || tx.status === 'partial'
    )

    return {
      expenseCents: sumAmountsCents(transactions),
      pendingCents: sumAmountsCents(pendingTransactions),
      pendingCount: pendingTransactions.length,
    }
  }, [data?.transactions])

  const cards = [
    {
      label: 'Despesas do mês',
      value: formatCurrency(centsToReais(metrics.expenseCents)),
      icon: CircleMinus,
      iconClass: 'text-rose-500',
      valueClass: 'text-slate-900',
    },
    {
      label: 'A pagar',
      value: formatCurrency(centsToReais(metrics.pendingCents)),
      subtitle:
        metrics.pendingCount > 0
          ? `${metrics.pendingCount} lançamento${metrics.pendingCount > 1 ? 's' : ''}`
          : 'Nenhum pendente',
      icon: Clock,
      iconClass: 'text-amber-500',
      valueClass: 'text-slate-900',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:px-6">
      {cards.map(card => (
        <div key={card.label} className="kpi-card">
          <div className="mb-3 flex items-center gap-2">
            <card.icon className={cn('size-4', card.iconClass)} />
            <span className="text-sm font-medium text-slate-600">{card.label}</span>
          </div>
          <p className={cn('text-2xl font-bold tabular-nums tracking-tight', card.valueClass)}>
            {card.value}
          </p>
          {card.subtitle && <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>}
        </div>
      ))}
    </div>
  )
}
