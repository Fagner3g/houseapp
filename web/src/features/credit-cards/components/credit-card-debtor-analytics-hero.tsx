import { Info } from 'lucide-react'

import { formatCurrency } from '@/lib/currency'

export function DebtorMetricsHero({ mySpend }: { mySpend: number }) {
  return (
    <div className="mt-5">
      <p className="text-3xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-4xl">
        {formatCurrency(mySpend)}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-700">Meu gasto</p>
      <p className="mt-0.5 text-sm text-slate-500">Sua parte nas compras deste ciclo</p>
    </div>
  )
}

export function DebtorShareBanner({
  mySpend,
  dividedCount,
  onViewDividedTransactions,
}: {
  mySpend: number
  dividedCount: number
  onViewDividedTransactions?: () => void
}) {
  if (dividedCount <= 0 || mySpend <= 0) return null

  return (
    <div className="mt-5 flex gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-700">
      <Info className="mt-0.5 size-4 shrink-0 text-slate-500" />
      <div className="space-y-1">
        <p>
          Sua parte nestas compras (
          <span className="font-medium tabular-nums">{formatCurrency(mySpend)}</span>
          ).
        </p>
        {onViewDividedTransactions && (
          <button
            type="button"
            className="cursor-pointer font-medium text-slate-700 underline-offset-2 hover:underline"
            onClick={onViewDividedTransactions}
          >
            Ver {dividedCount === 1 ? 'compra dividida' : `${dividedCount} compras divididas`}
          </button>
        )}
      </div>
    </div>
  )
}
