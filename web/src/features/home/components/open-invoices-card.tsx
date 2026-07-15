import dayjs from 'dayjs'
import { ChevronRight, CreditCard } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { useListAccounts } from '@/api/generated/api'
import type { InvoiceSummaryRow } from '@/features/transactions/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useInvoiceSummaryRows } from '@/features/transactions/hooks/use-invoice-summary-rows'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { monthKeyToRange } from '@/lib/date-range'
import { formatCentsString, moneyStringToReais } from '@/lib/currency'

interface OpenInvoicesCardProps {
  monthKey: string
}

function sortByDate(a: InvoiceSummaryRow, b: InvoiceSummaryRow) {
  return dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
}

export function OpenInvoicesCard({ monthKey }: OpenInvoicesCardProps) {
  const { slug } = useActiveOrganization()
  const { dateFrom, dateTo } = monthKeyToRange(monthKey)
  const accounts = useListAccounts(slug, { query: { enabled: !!slug } })
  const { summaries } = useInvoiceSummaryRows(dateFrom, dateTo, !!slug, { ownedOnly: true })
  const isLoading = accounts.isLoading

  const openInvoices = summaries
    .filter(inv => moneyStringToReais(inv.remaining) > 0)
    .sort(sortByDate)

  return (
    <Card className="finance-card">
      <CardHeader className="flex flex-row items-center gap-2">
        <CreditCard className="size-4 text-violet-500" />
        <div>
          <CardTitle className="text-base">Faturas em aberto</CardTitle>
          <p className="text-sm text-slate-500">Cartões de crédito no período</p>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {['skeleton-a', 'skeleton-b'].map(key => (
              <div key={key} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : openInvoices.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma fatura em aberto neste período</p>
        ) : (
          <div className="space-y-2">
            {openInvoices.slice(0, 5).map(invoice => (
              <Link
                key={invoice.id}
                to="/$org/accounts"
                params={{ org: slug }}
                search={{
                  accountId: invoice.accountId,
                  month: invoice.monthKey,
                  view: 'analytics',
                }}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{invoice.accountName}</p>
                  <p className="text-sm text-slate-500">
                    {invoice.title} · vence {dayjs(invoice.date).format('DD/MM')}
                  </p>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-1">
                  <span className="font-medium tabular-nums text-amber-600">
                    {formatCentsString(invoice.remaining)}
                  </span>
                  <ChevronRight className="size-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
