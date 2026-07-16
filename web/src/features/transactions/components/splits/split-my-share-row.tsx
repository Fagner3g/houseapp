import type { ReactNode } from 'react'

import { formatCurrency } from '@/lib/currency'

interface SplitMyShareRowProps {
  amountReais: number
  suffix?: ReactNode
}

/** Residual of the purchase not assigned to other people — omit when fully split away. */
export function SplitMyShareRow({ amountReais, suffix }: SplitMyShareRowProps) {
  if (amountReais < 0.005) return null

  return (
    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
      <span className="text-slate-500">Meu valor</span>
      <strong className="tabular-nums text-slate-900">
        {formatCurrency(amountReais)}
        {suffix}
      </strong>
    </div>
  )
}
