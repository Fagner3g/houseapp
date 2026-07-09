import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AccountPageHeaderProps {
  monthLabel: string
  onPrevMonth: () => void
  onNextMonth: () => void
}

export function AccountPageHeader({
  monthLabel,
  onPrevMonth,
  onNextMonth,
}: AccountPageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={onPrevMonth}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span
            className={cn(
              'min-w-[140px] text-center text-sm font-semibold capitalize text-slate-900'
            )}
          >
            {monthLabel}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={onNextMonth}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
