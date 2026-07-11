import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/currency'

export function CreditCardKpiSummaryLine({
  label,
  amount,
  emphasis = false,
  negative = false,
  action,
}: {
  label: string
  amount: number
  emphasis?: boolean
  negative?: boolean
  action?: { label: string; onClick: () => void }
}) {
  const formatted =
    negative && amount > 0 ? `− ${formatCurrency(amount)}` : formatCurrency(amount)

  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className={cn('text-slate-600', emphasis && 'font-medium text-slate-800')}>
        {label}
        {action ? (
          <>
            {' '}
            <button
              type="button"
              className="font-medium text-amber-700 underline-offset-2 hover:underline"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          </>
        ) : null}
      </span>
      <span
        className={cn(
          'shrink-0 tabular-nums',
          emphasis ? 'text-base font-semibold text-slate-900' : 'font-medium text-slate-800',
          negative && amount > 0 && 'text-emerald-700',
          action && amount > 0 && 'font-semibold text-amber-700'
        )}
      >
        {formatted}
      </span>
    </div>
  )
}
