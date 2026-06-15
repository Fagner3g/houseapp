import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const UPCOMING_DAY_OPTIONS = [7, 3, 1, 0] as const

export type OverdueFrequency = 'daily' | 'weekly' | 'monthly' | 'never'

type AlertScheduleFieldsProps = {
  upcomingDays: number[]
  onUpcomingDayToggle: (day: number) => void
  overdueFrequency: OverdueFrequency
  onOverdueFrequencyChange: (frequency: OverdueFrequency, interval?: number) => void
  overdueInterval: number
  disabled?: boolean
  upcomingLabel?: string
  overdueLabel?: string
  showNeverOption?: boolean
  hideOverdueSection?: boolean
  upcomingHelpText?: string
}

export function AlertScheduleFields({
  upcomingDays,
  onUpcomingDayToggle,
  overdueFrequency,
  onOverdueFrequencyChange,
  overdueInterval,
  disabled,
  upcomingLabel = 'Alertar antes do vencimento',
  overdueLabel = 'Vencidas — frequência',
  showNeverOption = false,
  hideOverdueSection = false,
  upcomingHelpText,
}: AlertScheduleFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">{upcomingLabel}</Label>
        {upcomingHelpText && (
          <p className="text-xs text-muted-foreground">{upcomingHelpText}</p>
        )}
        <div className="flex flex-wrap gap-3">
          {UPCOMING_DAY_OPTIONS.map(day => (
            <span key={day} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={upcomingDays.includes(day)}
                onCheckedChange={() => onUpcomingDayToggle(day)}
                disabled={disabled}
              />
              {day === 0 ? 'No dia' : `${day} dias antes`}
            </span>
          ))}
        </div>
      </div>

      {!hideOverdueSection && (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs">{overdueLabel}</Label>
          <Select
            value={overdueFrequency}
            onValueChange={v => onOverdueFrequencyChange(v as OverdueFrequency)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {showNeverOption && <SelectItem value="never">Nunca</SelectItem>}
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {overdueFrequency !== 'never' && (
          <div className="space-y-2">
            <Label className="text-xs">Intervalo</Label>
            <Select
              value={String(overdueInterval)}
              onValueChange={v => onOverdueFrequencyChange(overdueFrequency, Number(v))}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map(n => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      )}
    </div>
  )
}
