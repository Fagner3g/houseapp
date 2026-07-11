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
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>Progresso</span>
        <span className="tabular-nums">
          {current} de {total}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Parcela ${current} de ${total}`}
      >
        <div
          className="h-full rounded-full bg-slate-700 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
