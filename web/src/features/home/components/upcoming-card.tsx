import dayjs from 'dayjs'

import type { GetReportSummary200UpcomingItem } from '@/api/generated/model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCentsString } from '@/lib/currency'
import { useDrawerStore } from '@/stores/drawers'

interface UpcomingCardProps {
  items: GetReportSummary200UpcomingItem[]
}

export function UpcomingCard({ items }: UpcomingCardProps) {
  const openTransactionDrawer = useDrawerStore(s => s.openTransactionDrawer)

  if (!items.length) return null

  return (
    <Card className="finance-card">
      <CardHeader>
        <CardTitle className="text-base">Próximas (7 dias)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.slice(0, 5).map(item => (
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
      </CardContent>
    </Card>
  )
}
