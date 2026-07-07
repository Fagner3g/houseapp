import { cn } from '@/lib/utils'

export type QuickFilterBadgeOption<T extends string> = {
  id: T
  label: string
  count?: number
}

type QuickFilterBadgesProps<T extends string> = {
  value: T
  options: Array<QuickFilterBadgeOption<T>>
  onChange: (value: T) => void
  className?: string
}

export function QuickFilterBadges<T extends string>({
  value,
  options,
  onChange,
  className,
}: QuickFilterBadgesProps<T>) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {options.map(option => {
        const isActive = value === option.id
        const isDisabled = option.id !== 'all' && option.count === 0

        return (
          <button
            key={option.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(option.id)}
            className={cn(
              'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
              isActive
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
              isDisabled && 'cursor-not-allowed opacity-40 hover:border-slate-200 hover:bg-white'
            )}
          >
            {option.label}
            {option.count != null && option.id !== 'all' ? (
              <span className={cn('tabular-nums', isActive ? 'text-white/80' : 'text-slate-400')}>
                {option.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
