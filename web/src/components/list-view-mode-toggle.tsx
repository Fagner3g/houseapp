import { LayoutGrid, List } from 'lucide-react'

import { cn } from '@/lib/utils'

export type ListViewMode = 'grouped' | 'list'

type ListViewModeToggleProps = {
  value: ListViewMode
  onChange: (value: ListViewMode) => void
  className?: string
}

export function ListViewModeToggle({ value, onChange, className }: ListViewModeToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5',
        className
      )}
    >
      <button
        type="button"
        title="Agrupado"
        aria-label="Agrupado"
        onClick={() => onChange('grouped')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
          value === 'grouped'
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-50'
        )}
      >
        <LayoutGrid className="size-3.5 shrink-0" />
        Agrupado
      </button>
      <button
        type="button"
        title="Lista"
        aria-label="Lista"
        onClick={() => onChange('list')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
          value === 'list'
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-50'
        )}
      >
        <List className="size-3.5 shrink-0" />
        Lista
      </button>
    </div>
  )
}
