import { useEffect, useMemo } from 'react'

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

function isVisibleQuickFilterOption<T extends string>(option: QuickFilterBadgeOption<T>) {
  return option.id === 'all' || option.count == null || option.count > 0
}

export function resolveQuickFilterValue<T extends string>(
  value: T,
  options: Array<QuickFilterBadgeOption<T>>
): T {
  const visibleOptions = options.filter(isVisibleQuickFilterOption)
  if (visibleOptions.some(option => option.id === value)) return value
  return (visibleOptions.find(option => option.id === 'all') ?? visibleOptions[0])?.id ?? value
}

export function QuickFilterBadges<T extends string>({
  value,
  options,
  onChange,
  className,
}: QuickFilterBadgesProps<T>) {
  const visibleOptions = useMemo(
    () => options.filter(isVisibleQuickFilterOption),
    [options]
  )

  useEffect(() => {
    const resolved = resolveQuickFilterValue(value, options)
    if (resolved !== value) onChange(resolved)
  }, [options, value, onChange])

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {visibleOptions.map(option => {
        const isActive = value === option.id

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
              isActive
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
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
