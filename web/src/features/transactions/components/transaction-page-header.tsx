import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { pageSubtitle } from '@/lib/ui-classes'
import { useTransactionListQueryStore } from '@/stores/transaction-list-query'
import { cn } from '@/lib/utils'

const PERIOD_PRESETS = [
  { label: 'Este mês', key: 'month' as const },
  { label: 'Hoje', key: 'today' as const },
  { label: '7 dias', key: '7d' as const },
  { label: '30 dias', key: '30d' as const },
  { label: 'Personalizado', key: 'custom' as const },
]

function isFullMonth(dateFrom: string, dateTo: string): boolean {
  const from = dayjs(dateFrom)
  return (
    dateFrom === from.startOf('month').format('YYYY-MM-DD') &&
    dateTo === from.endOf('month').format('YYYY-MM-DD')
  )
}

function getActivePreset(dateFrom?: string, dateTo?: string): (typeof PERIOD_PRESETS)[number]['key'] {
  if (!dateFrom || !dateTo) return 'custom'
  const today = dayjs().format('YYYY-MM-DD')
  if (dateFrom === today && dateTo === today) return 'today'
  if (isFullMonth(dateFrom, dateTo) && dayjs(dateFrom).isSame(dayjs(), 'month')) {
    return 'month'
  }
  if (dateFrom === dayjs().subtract(7, 'day').format('YYYY-MM-DD') && dateTo === today) return '7d'
  if (dateFrom === dayjs().subtract(30, 'day').format('YYYY-MM-DD') && dateTo === today) return '30d'
  return 'custom'
}

export function TransactionPageHeader() {
  const { dateFrom, dateTo, setDateRange } = useTransactionListQueryStore()

  const activePreset = getActivePreset(dateFrom, dateTo)

  const dateRange = useMemo<DateRange | undefined>(() => {
    return {
      from: dayjs(dateFrom).toDate(),
      to: dayjs(dateTo).toDate(),
    }
  }, [dateFrom, dateTo])

  const setPreset = (key: (typeof PERIOD_PRESETS)[number]['key']) => {
    if (key === 'custom') return

    const today = dayjs().format('YYYY-MM-DD')
    switch (key) {
      case 'today':
        setDateRange(today, today)
        break
      case 'month':
        setDateRange(
          dayjs().startOf('month').format('YYYY-MM-DD'),
          dayjs().endOf('month').format('YYYY-MM-DD')
        )
        break
      case '7d':
        setDateRange(dayjs().subtract(7, 'day').format('YYYY-MM-DD'), today)
        break
      case '30d':
        setDateRange(dayjs().subtract(30, 'day').format('YYYY-MM-DD'), today)
        break
    }
  }

  const shiftPeriod = (direction: -1 | 1) => {
    if (activePreset === 'month' || isFullMonth(dateFrom, dateTo)) {
      const anchor = dayjs(dateFrom).add(direction, 'month')
      setDateRange(
        anchor.startOf('month').format('YYYY-MM-DD'),
        anchor.endOf('month').format('YYYY-MM-DD')
      )
      return
    }

    const from = dayjs(dateFrom)
    const to = dayjs(dateTo)
    const span = to.diff(from, 'day') + 1
    const shift = direction * span
    setDateRange(
      from.add(shift, 'day').format('YYYY-MM-DD'),
      to.add(shift, 'day').format('YYYY-MM-DD')
    )
  }

  return (
    <div className="space-y-3 px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className={pageSubtitle}>Gerencie suas receitas e despesas.</p>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              onClick={() => shiftPeriod(-1)}
              aria-label="Período anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <DateRangePicker
              className="w-auto [&_button]:h-9 [&_button]:w-auto [&_button]:rounded-lg [&_button]:border-slate-200 [&_button]:px-3 [&_button]:text-sm"
              value={dateRange}
              showFooter
              onApply={range => {
                if (range?.from) {
                  setDateRange(
                    dayjs(range.from).format('YYYY-MM-DD'),
                    dayjs(range.to ?? range.from).format('YYYY-MM-DD')
                  )
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              onClick={() => shiftPeriod(1)}
              aria-label="Próximo período"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="flex flex-wrap justify-end gap-1">
            {PERIOD_PRESETS.map(preset => {
              const active = activePreset === preset.key
              return (
                <button
                  key={preset.key}
                  type="button"
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  )}
                  onClick={() => setPreset(preset.key)}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
