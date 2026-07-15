import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const TRANSACTION_STATUS_LABELS = {
  paid: 'Pago',
  partial: 'Parcial',
  pending: 'Pendente',
} as const

const TRANSACTION_STATUS_VARIANT = {
  paid: 'default',
  partial: 'partial',
  pending: 'warning',
} as const

export function TransactionStatusBadge({ status }: { status: 'paid' | 'partial' | 'pending' }) {
  return (
    <Badge variant={TRANSACTION_STATUS_VARIANT[status]} className="mt-0.5 text-[10px] uppercase">
      {TRANSACTION_STATUS_LABELS[status]}
    </Badge>
  )
}

export function SummaryMetric({
  label,
  value,
  emphasize = false,
  className,
}: {
  label: string
  value: ReactNode
  emphasize?: boolean
  className?: string
}) {
  return (
    <div className={cn('rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200/70', className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={cn(
          'mt-0.5 tabular-nums text-slate-900',
          emphasize ? 'text-base font-semibold tracking-tight' : 'text-sm font-medium'
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function SummaryChip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'warning' | 'success'
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
        tone === 'warning' && 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80',
        tone === 'success' && 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80',
        tone === 'neutral' && 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'
      )}
    >
      {children}
    </span>
  )
}
