import dayjs from 'dayjs'
import { AlertTriangle, ChevronRight, Clock, Users } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

import { useListAccounts, useListTransactions } from '@/api/generated/api'
import type {
  GetReportSummary200,
  GetReportSummary200UpcomingItem,
  ListPendingSplits200SplitsItem,
} from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCentsString, formatCurrency, moneyStringToCents } from '@/lib/currency'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useDrawerStore } from '@/stores/drawers'

interface AttentionPanelProps {
  summary: GetReportSummary200
  splits: ListPendingSplits200SplitsItem[]
}

function UpcomingList({ items }: { items: GetReportSummary200UpcomingItem[] }) {
  const openTransactionDrawer = useDrawerStore(s => s.openTransactionDrawer)

  return (
    <div className="space-y-2">
      {items.slice(0, 4).map(item => (
        <button
          key={item.id}
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-slate-100 p-3 text-left hover:bg-slate-50"
          onClick={() => openTransactionDrawer(undefined, item.id)}
        >
          <div>
            <p className="font-medium text-slate-900">{item.title}</p>
            <p className="text-sm text-slate-500">{dayjs(item.date).format('DD/MM')}</p>
          </div>
          <span className="font-medium tabular-nums text-slate-700">
            {formatCentsString(item.amount)}
          </span>
        </button>
      ))}
    </div>
  )
}

function OverdueList({ overdueCount }: { overdueCount: number }) {
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
      dateTo: dayjs().subtract(1, 'day').endOf('day').toISOString(),
      payableOnly: true,
      perPage: 4,
    },
    { query: { enabled: !!slug && overdueCount > 0 } }
  )

  const items = data?.transactions ?? []

  return (
    <div className="space-y-2">
      {items.map(tx => {
        const account = accountsData?.accounts?.find(a => a.id === tx.accountId)
        const isCreditCardExpense = account?.type === 'credit_card' && tx.type === 'expense'

        return (
          <div
            key={tx.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50/50 p-3"
          >
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
          Ver todas ({overdueCount})
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  )
}

function SplitsList({
  splits,
  total,
}: {
  splits: ListPendingSplits200SplitsItem[]
  total: string
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-amber-600">Total: {formatCentsString(total)}</p>
      {splits.slice(0, 4).map(split => {
        const remainingCents = Math.max(
          0,
          moneyStringToCents(split.amount) - moneyStringToCents(split.paidAmount)
        )
        return (
          <div
            key={split.id}
            className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
          >
            <div>
              <p className="font-medium text-slate-900">
                {split.personName ?? split.contactName ?? 'Contato'}
              </p>
              <p className="text-sm text-slate-500">{split.transactionTitle}</p>
            </div>
            <span className="font-medium tabular-nums text-amber-600">
              {formatCurrency(remainingCents / 100)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function AttentionPanel({ summary, splits }: AttentionPanelProps) {
  const hasOverdue = summary.overdueCount > 0
  const hasUpcoming = summary.upcoming.length > 0
  const hasSplits = splits.length > 0
  const hasAnything = hasOverdue || hasUpcoming || hasSplits

  return (
    <Card className="finance-card">
      <CardHeader>
        <CardTitle className="text-base">Precisa de atenção</CardTitle>
        <p className="text-sm text-slate-500">Situação atual — não filtrada pelo mês</p>
      </CardHeader>
      <CardContent>
        {!hasAnything ? (
          <p className="py-4 text-sm text-slate-500">Tudo em dia. Nenhuma pendência urgente.</p>
        ) : (
          <div className="space-y-6">
            {hasOverdue && (
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    Vencidas ({summary.overdueCount})
                  </h3>
                </div>
                <OverdueList overdueCount={summary.overdueCount} />
              </section>
            )}

            {hasUpcoming && (
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Clock className="size-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-800">Próximas (7 dias)</h3>
                </div>
                <UpcomingList items={summary.upcoming} />
              </section>
            )}

            {hasSplits && (
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Users className="size-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-slate-800">Quem me deve</h3>
                </div>
                <SplitsList splits={splits} total={summary.myPendingSplitsTotal} />
              </section>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
