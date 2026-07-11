import type { KpiBreakdownLine } from '@/features/transactions/lib/kpi-summary'
import { cn } from '@/lib/utils'

export function KpiBreakdown({ lines }: { lines: KpiBreakdownLine[] }) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      {lines.map((line, index) => {
        const showDivider = line.emphasis && index > 0

        return (
          <div key={line.label}>
            {showDivider && <div className="mb-2 border-t border-slate-200" />}
            <div className="flex items-center justify-between gap-3">
              <p
                className={cn(
                  'text-xs text-slate-600',
                  line.emphasis && 'text-sm font-medium text-slate-800'
                )}
              >
                {line.label}
              </p>
              <p
                className={cn(
                  'shrink-0 text-sm font-medium tabular-nums text-slate-800',
                  line.emphasis && 'text-base font-bold text-slate-900',
                  line.className
                )}
              >
                {line.prefix}
                {line.value}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
