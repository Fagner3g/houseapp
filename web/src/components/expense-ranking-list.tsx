import dayjs from 'dayjs'
import { ChevronRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { formatCentsString } from '@/lib/currency'
import { cn } from '@/lib/utils'

export type ExpenseRankingItem = {
  id: string
  label: string
  total: string
  percentage: string
  subtitle?: string
  isRecurring?: boolean
  delegatedToName?: string | null
  color?: string | null
  occurrenceCount?: number
}

interface ExpenseRankingListProps {
  items: ExpenseRankingItem[]
  grandTotal?: string
  emptyMessage?: string
  className?: string
  showRank?: boolean
  onItemClick?: (item: ExpenseRankingItem) => void
}

export function ExpenseRankingList({
  items,
  grandTotal,
  emptyMessage = 'Nenhum gasto no período',
  className,
  showRank = false,
  onItemClick,
}: ExpenseRankingListProps) {
  const max = items.reduce((acc, item) => Math.max(acc, Number(item.total)), 0)
  const total = grandTotal
    ? Number(grandTotal)
    : items.reduce((acc, item) => acc + Number(item.total), 0)

  if (!items.length) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>
  }

  return (
    <div className={cn('space-y-1', className)}>
      {items.map((item, index) => {
        const amount = Number(item.total)
        const barPct = max > 0 ? (amount / max) * 100 : 0
        const sharePct = total > 0 ? ((amount / total) * 100).toFixed(0) : '0'
        const barColor = item.color ?? '#8b5cf6'
        const isInteractive = !!onItemClick

        const content = (
          <>
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {showRank ? (
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                      index === 0 && 'bg-violet-100 text-violet-700',
                      index === 1 && 'bg-slate-100 text-slate-600',
                      index === 2 && 'bg-amber-50 text-amber-700',
                      index > 2 && 'text-slate-400'
                    )}
                  >
                    {index + 1}
                  </span>
                ) : item.color ? (
                  <span
                    className="mt-0.5 size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: barColor }}
                  />
                ) : null}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-800">
                      {item.label}
                    </span>
                    {item.isRecurring ? (
                      <Badge
                        variant="secondary"
                        className="shrink-0 border-violet-200 bg-violet-50 text-[10px] font-medium text-violet-700"
                      >
                        Recorrente
                      </Badge>
                    ) : null}
                    {item.delegatedToName ? (
                      <Badge
                        variant="secondary"
                        className="shrink-0 border-amber-200 bg-amber-50 text-[10px] font-medium text-amber-800"
                      >
                        Delegada · {item.delegatedToName}
                      </Badge>
                    ) : null}
                  </div>
                  {item.subtitle ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      {item.subtitle}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-slate-900">
                    {formatCentsString(item.total)}
                  </p>
                  <p className="text-xs tabular-nums text-slate-500">{sharePct}%</p>
                </div>
                {isInteractive ? (
                  <ChevronRight className="size-4 text-slate-300 transition-colors group-hover:text-violet-500" />
                ) : null}
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${barPct}%`, backgroundColor: barColor }}
              />
            </div>
          </>
        )

        if (!isInteractive) {
          return (
            <div key={item.id} className="rounded-lg px-2 py-2.5">
              {content}
            </div>
          )
        }

        return (
          <button
            key={item.id}
            type="button"
            className="group w-full cursor-pointer rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
            onPointerDown={event => event.stopPropagation()}
            onClick={event => {
              event.preventDefault()
              event.stopPropagation()
              onItemClick(item)
            }}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}

export function formatMerchantSubtitle(
  occurrenceCount: number,
  avgAmount: string,
  lastDate: string
) {
  const purchaseLabel =
    occurrenceCount === 1
      ? '1 compra nesta fatura'
      : `${occurrenceCount} compras nesta fatura`

  const avgLabel =
    occurrenceCount === 1
      ? `valor ${formatCentsString(avgAmount)}`
      : `média de ${formatCentsString(avgAmount)} por compra`

  const parts = [purchaseLabel, avgLabel]

  if (lastDate) {
    parts.push(`última em ${dayjs(lastDate).format('DD/MM/YYYY')}`)
  }

  return parts.join(' · ')
}
