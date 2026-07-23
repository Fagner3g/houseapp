import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { computeSplitDebtProgress } from '../../split-debt-summary.utils'

type SplitPaymentProgressProps = {
  totalOwed: string
  totalPaid: string
  className?: string
}

/** Paid vs remaining bar for a split share or person debt total. */
export function SplitPaymentProgress({
  totalOwed,
  totalPaid,
  className,
}: SplitPaymentProgressProps) {
  const progress = computeSplitDebtProgress(totalOwed, totalPaid)
  if (progress.paidReais < 0.005) return null

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-amber-100"
        role="progressbar"
        aria-valuenow={Math.round(progress.paidPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(progress.paidPercent)}% pago`}
      >
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${progress.paidPercent}%` }}
        />
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600">
        <span>
          Pago:{' '}
          <strong className="tabular-nums text-emerald-700">
            {formatCurrency(progress.paidReais)}
          </strong>
        </span>
        <span>
          Falta:{' '}
          <strong className="tabular-nums text-amber-700">
            {formatCurrency(progress.remainingReais)}
          </strong>
        </span>
      </div>
    </div>
  )
}
