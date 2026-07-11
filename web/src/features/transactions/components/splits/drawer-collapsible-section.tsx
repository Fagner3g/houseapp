import { ChevronDown, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface DrawerCollapsibleSectionProps {
  icon: LucideIcon
  title: string
  summary?: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  disabled?: boolean
}

export function DrawerCollapsibleSection({
  icon: Icon,
  title,
  summary,
  open,
  onOpenChange,
  children,
  disabled = false,
}: DrawerCollapsibleSectionProps) {
  return (
    <div className="rounded-lg border border-slate-200">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed"
        onClick={() => onOpenChange(!open)}
        disabled={disabled}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{title}</span>
          {summary}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && <div className="space-y-3 border-t border-slate-100 px-4 py-3">{children}</div>}
    </div>
  )
}
