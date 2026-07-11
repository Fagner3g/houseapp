import type { ListAlertRules200RulesItem } from '@/api/generated/model/listAlertRules200RulesItem'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DayOptions } from '@/features/transactions/components/transaction-reminders/day-options'
import { cn } from '@/lib/utils'

import { CHANNEL_OPTIONS } from '../lib/alert-labels'

export type RuleDraft = {
  selectedDays: number[]
  overdueFrequency: 'daily' | 'weekly' | 'monthly'
  overdueInterval: number
  channels: string[]
}

export function loadRuleDraft(rule: ListAlertRules200RulesItem): RuleDraft {
  if (rule.triggerType === 'upcoming' && 'daysBefore' in rule.config) {
    return {
      selectedDays: [...rule.config.daysBefore].sort((a, b) => a - b),
      overdueFrequency: 'daily',
      overdueInterval: 1,
      channels: [...rule.channels],
    }
  }

  if (rule.triggerType === 'overdue' && 'frequency' in rule.config) {
    return {
      selectedDays: [1, 3, 7],
      overdueFrequency: rule.config.frequency,
      overdueInterval: rule.config.interval,
      channels: [...rule.channels],
    }
  }

  return {
    selectedDays: [1, 3, 7],
    overdueFrequency: 'daily',
    overdueInterval: 1,
    channels: ['in_app', 'extension'],
  }
}

type AlertsRuleFormProps = {
  rule: ListAlertRules200RulesItem
  draft: RuleDraft
  isSaving: boolean
  onChange: (draft: RuleDraft) => void
  onCancel: () => void
  onSave: () => void
}

export function AlertsRuleForm({
  rule,
  draft,
  isSaving,
  onChange,
  onCancel,
  onSave,
}: AlertsRuleFormProps) {
  const toggleDay = (day: number) => {
    onChange({
      ...draft,
      selectedDays: draft.selectedDays.includes(day)
        ? draft.selectedDays.filter(value => value !== day)
        : [...draft.selectedDays, day].sort((a, b) => a - b),
    })
  }

  const toggleChannel = (channel: string) => {
    onChange({
      ...draft,
      channels: draft.channels.includes(channel)
        ? draft.channels.filter(value => value !== channel)
        : [...draft.channels, channel],
    })
  }

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4">
      {rule.triggerType === 'upcoming' ? (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Dias antes</p>
          <DayOptions selectedDays={draft.selectedDays} onToggle={toggleDay} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Frequência</Label>
            <Select
              value={draft.overdueFrequency}
              onValueChange={value =>
                onChange({
                  ...draft,
                  overdueFrequency: value as RuleDraft['overdueFrequency'],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diária</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Intervalo</Label>
            <Input
              type="number"
              min={1}
              value={draft.overdueInterval}
              onChange={event =>
                onChange({
                  ...draft,
                  overdueInterval: Math.max(1, Number(event.target.value) || 1),
                })
              }
            />
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Canais</p>
        <div className="flex flex-wrap gap-2">
          {CHANNEL_OPTIONS.map(channel => (
            <button
              key={channel.value}
              type="button"
              onClick={() => toggleChannel(channel.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm transition-colors',
                draft.channels.includes(channel.value)
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              {channel.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          disabled={isSaving}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          disabled={isSaving}
          onClick={onSave}
        >
          Salvar
        </button>
      </div>
    </div>
  )
}
