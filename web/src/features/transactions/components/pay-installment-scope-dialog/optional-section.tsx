import { ChevronDown, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type OptionalSectionProps = {
  icon: LucideIcon
  title: string
  hint?: string
  summary?: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  className?: string
}

export function OptionalSection({
  icon: Icon,
  title,
  hint,
  summary,
  open,
  onOpenChange,
  children,
  className,
}: OptionalSectionProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-colors',
        open && 'border-slate-200',
        className
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-slate-50/80"
        onClick={() => onOpenChange(!open)}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{title}</span>
            {summary}
          </span>
          {hint && !open ? (
            <span className="mt-0.5 block truncate text-xs text-slate-500">{hint}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-slate-400 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-slate-100 px-3.5 pb-3.5 pt-3">
          {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
          {children}
        </div>
      ) : null}
    </div>
  )
}
