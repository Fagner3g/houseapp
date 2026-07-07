import { keepPreviousData } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Link } from '@tanstack/react-router'
import { ExternalLink, Plus } from 'lucide-react'

import { useListTransactions } from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import { TransactionList } from '@/features/transactions/components/transaction-list'
import { toTransactionListItem } from '@/features/transactions/types'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useDrawerStore } from '@/stores/drawers'

interface AccountStatementSectionProps {
  accountId: string
  accountType: string
  dateFrom: string
  dateTo: string
  onImported?: () => void
}

export function AccountStatementSection({
  accountId,
  dateFrom,
  dateTo,
}: AccountStatementSectionProps) {
  const { slug } = useActiveOrganization()
  const openTransactionDrawer = useDrawerStore(s => s.openTransactionDrawer)

  const dateFromIso = dayjs(dateFrom).startOf('day').toISOString()
  const dateToIso = dayjs(dateTo).endOf('day').toISOString()

  const { data } = useListTransactions(
    slug,
    { accountId, dateFrom: dateFromIso, dateTo: dateToIso, perPage: 100 },
    { query: { enabled: !!slug && !!accountId, placeholderData: keepPreviousData } }
  )

  return (
    <section className="mt-6 space-y-4">
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Lançamentos</h2>
          <p className="text-sm text-slate-500">
            {dayjs(dateFrom).format('DD/MM')} – {dayjs(dateTo).format('DD/MM/YYYY')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() =>
              openTransactionDrawer(
                {
                  accountId,
                  type: 'expense',
                  date: dayjs().toISOString(),
                },
                null,
                { lockAccountId: accountId }
              )
            }
          >
            <Plus className="mr-1.5 size-4" />
            Adicionar lançamento
          </Button>
          <Link
            to="/$org/accounts/$id"
            params={{ org: slug, id: accountId }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <ExternalLink className="size-4" />
            Detalhes
          </Link>
        </div>
      </div>

      <TransactionList
        items={(data?.transactions ?? []).map(toTransactionListItem)}
        showPayAction
        accountId={accountId}
      />
    </section>
  )
}
