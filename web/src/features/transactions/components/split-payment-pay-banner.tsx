import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

import type { UnsettledSplitItem } from '../split-debt-summary.utils'
import { splitPaymentPayBannerHint } from '../lib/split-reimbursement-copy'
import { SPLIT_STATUS_LABELS, SPLIT_STATUS_VARIANT } from './splits/split-status'

type SplitPaymentPayBannerProps = {
  items: UnsettledSplitItem[]
  className?: string
}

export function SplitPaymentPayBanner({ items, className }: SplitPaymentPayBannerProps) {
  if (items.length === 0) return null

  return (
    <div className={cn('space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4', className)}>
      <p className="text-sm font-medium text-amber-900">Esta transação está dividida</p>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item.split.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-amber-900">{item.label}</span>
            <span className="flex items-center gap-2">
              <span className="tabular-nums text-amber-800">
                Falta {formatCurrency(item.remainingReais)}
              </span>
              <Badge
                variant={SPLIT_STATUS_VARIANT[item.split.status]}
                className="text-[10px] uppercase"
              >
                {SPLIT_STATUS_LABELS[item.split.status]}
              </Badge>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-amber-800">{splitPaymentPayBannerHint()}</p>
    </div>
  )
}
