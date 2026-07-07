import type { ListPendingSplits200SplitsItem } from '@/api/generated/model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCentsString, formatCurrency, moneyStringToCents } from '@/lib/currency'

interface PendingSplitsCardProps {
  splits: ListPendingSplits200SplitsItem[]
  total: string
}

export function PendingSplitsCard({ splits, total }: PendingSplitsCardProps) {
  if (!splits.length) return null

  return (
    <Card className="finance-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Quem me deve</CardTitle>
        <span className="text-sm font-medium text-amber-600">{formatCentsString(total)}</span>
      </CardHeader>
      <CardContent className="space-y-2">
        {splits.slice(0, 5).map(split => {
          const remainingCents = Math.max(
            0,
            moneyStringToCents(split.amount) - moneyStringToCents(split.paidAmount)
          )
          const name = split.contactName ?? 'Contato'
          return (
            <div
              key={split.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
            >
              <div>
                <p className="font-medium text-slate-900">{name}</p>
                <p className="text-sm text-slate-500">{split.transactionTitle}</p>
              </div>
              <span className="font-medium tabular-nums text-amber-600">
                {formatCurrency(remainingCents / 100)}
              </span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
