import type { ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { KpiSummaryItem } from '@/features/transactions/lib/kpi-summary-items'
import { cn } from '@/lib/utils'

export type { KpiSummaryItem }

type KpiSummaryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  totalLabel: string
  total: ReactNode
  totalClassName?: string
  items: KpiSummaryItem[]
  isLoading?: boolean
  emptyMessage: string
  footerHint?: string
}

export function KpiSummaryDialog({
  open,
  onOpenChange,
  title,
  description,
  totalLabel,
  total,
  totalClassName,
  items,
  isLoading = false,
  emptyMessage,
  footerHint,
}: KpiSummaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-xs font-medium text-slate-600">{totalLabel}</p>
          <p className={cn('text-xl font-bold tabular-nums text-slate-900', totalClassName)}>
            {total}
          </p>
        </div>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-slate-500">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{emptyMessage}</p>
          ) : (
            items.map(item => {
              const content = (
                <>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{item.title}</p>
                    {item.subtitle && (
                      <p className="truncate text-sm text-slate-500">{item.subtitle}</p>
                    )}
                    {item.meta && <p className="text-xs text-slate-400">{item.meta}</p>}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 font-medium tabular-nums text-slate-700',
                      item.amountClassName
                    )}
                  >
                    {item.amountLabel}
                  </span>
                </>
              )

              if (!item.onClick) {
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3"
                  >
                    {content}
                  </div>
                )
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 text-left transition-colors hover:bg-slate-50"
                  onClick={() => {
                    onOpenChange(false)
                    item.onClick?.()
                  }}
                >
                  {content}
                </button>
              )
            })
          )}
        </div>

        {footerHint && items.length > 0 && (
          <p className="text-center text-xs text-slate-400">{footerHint}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
