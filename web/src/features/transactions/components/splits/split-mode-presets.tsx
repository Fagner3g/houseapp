import { SPLIT_MODE_LABELS } from '@/features/accounts/components/import-review-fields'
import type { SplitMode } from '@/features/accounts/components/import-review-types'
import { cn } from '@/lib/utils'

const ADD_SPLIT_MODES: SplitMode[] = ['half', 'custom', 'full_other']
const DRAFT_MODES: SplitMode[] = ['none', 'half', 'custom', 'full_other']

interface SplitModePresetsProps {
  value: SplitMode
  onChange: (mode: SplitMode) => void
  variant?: 'draft' | 'add'
  disabled?: boolean
}

export function SplitModePresets({
  value,
  onChange,
  variant = 'draft',
  disabled = false,
}: SplitModePresetsProps) {
  const modes = variant === 'add' ? ADD_SPLIT_MODES : DRAFT_MODES

  return (
    <div className="flex flex-wrap gap-2">
      {modes.map(mode => (
        <button
          key={mode}
          type="button"
          disabled={disabled}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            value === mode
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          )}
          onClick={() => onChange(mode)}
        >
          {SPLIT_MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  )
}
