import { ChevronDown } from 'lucide-react'
import { type ReactNode, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { KpiBreakdownLine, KpiSummaryItem } from '@/features/transactions/lib/kpi-summary'
import { cn } from '@/lib/utils'

import { KpiBreakdown } from './kpi-breakdown'

export type { KpiSummaryItem }

type KpiSummaryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  totalLabel: string
  total: ReactNode
  totalClassName?: string
  breakdown?: KpiBreakdownLine[]
  itemsLabel?: string
  items: KpiSummaryItem[]
  secondaryItemsLabel?: string
  secondaryItems?: KpiSummaryItem[]
  isLoading?: boolean
  emptyMessage: string
  footerHint?: string
}

function ItemRow({
  item,
  onOpenChange,
  nested = false,
}: {
  item: KpiSummaryItem
  onOpenChange: (open: boolean) => void
  nested?: boolean
}) {
  const content = (
    <>
      <div className="min-w-0">
        <p className={cn('truncate font-medium text-slate-900', nested && 'text-sm')}>
          {item.title}
        </p>
        {item.subtitle && <p className="truncate text-sm text-slate-500">{item.subtitle}</p>}
        {item.meta && <p className="text-xs text-slate-400">{item.meta}</p>}
      </div>
      <span
        className={cn('shrink-0 font-medium tabular-nums text-slate-700', item.amountClassName)}
      >
        {item.amountLabel}
      </span>
    </>
  )

  if (!item.onClick) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3',
          nested && 'border-0 bg-transparent py-2 pl-0 pr-0'
        )}
      >
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 text-left transition-colors hover:bg-slate-50',
        nested && 'border-0 bg-transparent py-2 hover:bg-slate-100/80'
      )}
      onClick={() => {
        onOpenChange(false)
        item.onClick?.()
      }}
    >
      {content}
    </button>
  )
}

function ExpandableGroup({
  item,
  onOpenChange,
}: {
  item: KpiSummaryItem
  onOpenChange: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const children = item.children ?? []

  return (
    <div className="rounded-lg border border-slate-100">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-slate-50"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex min-w-0 items-center gap-2">
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-slate-400 transition-transform',
              open && 'rotate-180'
            )}
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{item.title}</p>
            {item.meta && <p className="text-xs text-slate-400">{item.meta}</p>}
          </div>
        </div>
        <span
          className={cn('shrink-0 font-medium tabular-nums text-slate-700', item.amountClassName)}
        >
          {item.amountLabel}
        </span>
      </button>

      {open && (
        <div className="space-y-0.5 border-t border-slate-100 px-3 py-1 pl-9">
          {children.map(child => (
            <ItemRow key={child.id} item={child} onOpenChange={onOpenChange} nested />
          ))}
        </div>
      )}
    </div>
  )
}

export function KpiSummaryDialog({
  open,
  onOpenChange,
  title,
  description,
  totalLabel,
  total,
  totalClassName,
  breakdown,
  itemsLabel,
  items,
  secondaryItemsLabel,
  secondaryItems = [],
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

        {breakdown && breakdown.length > 0 ? (
          <KpiBreakdown lines={breakdown} />
        ) : (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-600">{totalLabel}</p>
            <p className={cn('text-xl font-bold tabular-nums text-slate-900', totalClassName)}>
              {total}
            </p>
          </div>
        )}

        <div key={String(open)} className="max-h-[50vh] space-y-2 overflow-y-auto">
          {itemsLabel && items.length > 0 && (
            <p className="text-xs font-medium text-slate-500">{itemsLabel}</p>
          )}
          {isLoading ? (
            <p className="py-6 text-center text-sm text-slate-500">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{emptyMessage}</p>
          ) : (
            items.map(item =>
              item.children && item.children.length > 0 ? (
                <ExpandableGroup key={item.id} item={item} onOpenChange={onOpenChange} />
              ) : (
                <ItemRow key={item.id} item={item} onOpenChange={onOpenChange} />
              )
            )
          )}
        </div>

        {secondaryItemsLabel && secondaryItems.length > 0 && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-500">{secondaryItemsLabel}</p>
            {secondaryItems.map(item => (
              <ItemRow key={item.id} item={item} onOpenChange={onOpenChange} />
            ))}
          </div>
        )}

        {footerHint && (items.length > 0 || secondaryItems.length > 0) && (
          <p className="text-center text-xs text-slate-400">{footerHint}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
