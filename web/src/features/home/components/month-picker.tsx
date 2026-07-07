import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { monthKeyToRange, shiftMonth } from '@/lib/date-range'

interface MonthPickerProps {
  monthKey: string
  onChange: (monthKey: string) => void
}

export function MonthPicker({ monthKey, onChange }: MonthPickerProps) {
  const { label } = monthKeyToRange(monthKey)
  const isCurrentMonth = monthKey === dayjs().format('YYYY-MM')

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => onChange(shiftMonth(monthKey, -1))}
        aria-label="Mês anterior"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[140px] text-center text-sm font-medium capitalize text-slate-700">
        {label}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        disabled={isCurrentMonth}
        onClick={() => onChange(shiftMonth(monthKey, 1))}
        aria-label="Próximo mês"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
