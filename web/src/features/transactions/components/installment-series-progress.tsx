import { cn } from '@/lib/utils'

type InstallmentSeriesProgressProps = {
  current: number
  total: number
  className?: string
}

/** Visual progress through a finite installment series (e.g. parcel 2 of 4). */
export function InstallmentSeriesProgress({
  current,
  total,
  className,
}: InstallmentSeriesProgressProps) {
  if (total <= 1 || current < 1) return null

  const percent = Math.min(100, Math.max(0, (current / total) * 100))

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        <span>Progresso</span>
        <span className="tabular-nums normal-case tracking-normal text-slate-600">
          {current} de {total}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/80"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Parcela ${current} de ${total}`}
      >
        <div
          className="h-full rounded-full bg-slate-800 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
