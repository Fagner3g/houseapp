import dayjs from 'dayjs'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

import { useListAccounts, useListTransactions } from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCentsString } from '@/lib/currency'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useDrawerStore } from '@/stores/drawers'

interface OverdueCardProps {
  overdueCount: number
}

export function OverdueCard({ overdueCount }: OverdueCardProps) {
  const { slug } = useActiveOrganization()
  const navigate = useNavigate()
  const openPayDrawer = useDrawerStore(s => s.openTransactionPayDrawer)
  const openEditDrawer = useDrawerStore(s => s.openTransactionDrawer)

  const { data: accountsData } = useListAccounts(slug, {
    query: { enabled: !!slug && overdueCount > 0 },
  })

  const { data } = useListTransactions(
    slug,
    {
      status: 'pending',
      dateTo: dayjs().subtract(1, 'day').endOf('day').toISOString(),
      payableOnly: true,
      perPage: 5,
    },
    { query: { enabled: !!slug && overdueCount > 0 } }
  )

  const items = data?.transactions ?? []

  if (overdueCount === 0) return null

  return (
    <Card className="finance-card border-amber-200/80 bg-amber-50/40">
      <CardHeader className="flex flex-row items-center gap-2">
        <AlertTriangle className="size-4 text-amber-600" />
        <CardTitle className="text-base text-amber-900">
          Vencidas ({overdueCount})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(tx => {
          const account = accountsData?.accounts?.find(a => a.id === tx.accountId)
          const isCreditCardExpense = account?.type === 'credit_card' && tx.type === 'expense'

          return (
          <div key={tx.id} className="flex items-center justify-between gap-2 rounded-lg bg-white p-3">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => openEditDrawer(undefined, tx.id)}
            >
              <p className="truncate font-medium text-slate-900">{tx.title}</p>
              <p className="text-sm text-slate-500">
                {dayjs(tx.date).format('DD/MM')} · {formatCentsString(tx.amount)}
              </p>
            </button>
            {!isCreditCardExpense && (
              <Button size="sm" onClick={() => openPayDrawer(tx.id)}>
                Pagar
              </Button>
            )}
          </div>
          )
        })}
        {overdueCount > items.length && (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-0.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            onClick={() =>
              navigate({
                to: '/$org/transactions/overdue',
                params: { org: slug },
              })
            }
          >
            Ver todas as vencidas
            <ChevronRight className="size-4" />
          </button>
        )}
      </CardContent>
    </Card>
  )
}
