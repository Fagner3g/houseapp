import { cn } from '@/lib/utils'

import { getImportReviewSignedAmount } from '../lib/import-review-amount'

type ImportReviewSignedAmountProps = {
  amount: string
  type: 'income' | 'expense'
  className?: string
  muted?: boolean
}

export function ImportReviewSignedAmount({
  amount,
  type,
  className,
  muted = false,
}: ImportReviewSignedAmountProps) {
  const signed = getImportReviewSignedAmount(amount, type)

  return (
    <span className={cn('tabular-nums font-semibold', muted ? 'text-slate-500' : signed.className, className)}>
      {signed.label}
    </span>
  )
}
