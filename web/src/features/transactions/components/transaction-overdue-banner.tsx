import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { useGetReportSummary } from '@/api/generated/api'
import dayjs from 'dayjs'

import { useActiveOrganization } from '@/hooks/use-active-organization'

export function TransactionOverdueBanner() {
  const { slug } = useActiveOrganization()

  const { data } = useGetReportSummary(
    slug,
    {
      dateFrom: dayjs().startOf('month').toISOString(),
      dateTo: dayjs().endOf('month').toISOString(),
    },
    { query: { enabled: !!slug } }
  )

  if (!data?.overdueCount || !slug) return null

  const count = data.overdueCount
  const label = count === 1 ? '1 lançamento vencido' : `${count} lançamentos vencidos`

  return (
    <div className="mx-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 lg:mx-6">
      <div className="flex min-w-0 items-center gap-2 text-sm text-amber-900">
        <AlertTriangle className="size-4 shrink-0 text-amber-600" />
        <span>
          Você tem <strong>{label}</strong>.
        </span>
      </div>
      <Link
        to="/$org/transactions/overdue"
        params={{ org: slug }}
        className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-amber-800 hover:text-amber-950"
      >
        Conferir
        <ChevronRight className="size-4" />
      </Link>
    </div>
  )
}
