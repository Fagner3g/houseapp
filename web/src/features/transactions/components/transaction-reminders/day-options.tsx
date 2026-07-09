import { cn } from '@/lib/utils'

export const DAY_OPTIONS = [0, 1, 3, 7, 15, 30] as const

type DayOptionsProps = {
  selectedDays: number[]
  onToggle: (day: number) => void
  disabled?: boolean
}

export function DayOptions({ selectedDays, onToggle, disabled = false }: DayOptionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {DAY_OPTIONS.map(day => (
        <button
          key={day}
          type="button"
          disabled={disabled}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            selectedDays.includes(day)
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          )}
          onClick={() => onToggle(day)}
        >
          {day === 0 ? 'No dia' : `${day}d`}
        </button>
      ))}
    </div>
  )
}
