import { Link } from '@tanstack/react-router'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { formatOverdueSchedule } from '@/features/transactions/lib/notify-labels'
import { cn } from '@/lib/utils'

import type { OverdueNotifyMode, TransactionNotifyState } from './types'

type OverdueBlockProps = {
  value: TransactionNotifyState
  onChange: (value: TransactionNotifyState) => void
  orgHasOverdueRule: boolean
  orgOverdueFrequency: 'daily' | 'weekly' | 'monthly'
  orgOverdueInterval: number
  disabled?: boolean
}

const MODE_OPTIONS: { value: OverdueNotifyMode; label: string }[] = [
  { value: 'organization', label: 'Padrão da organização' },
  { value: 'custom', label: 'Personalizado' },
  { value: 'disabled', label: 'Não avisar' },
]

export function OverdueBlock({
  value,
  onChange,
  orgHasOverdueRule,
  orgOverdueFrequency,
  orgOverdueInterval,
  disabled = false,
}: OverdueBlockProps) {
  const { slug } = useActiveOrganization()

  const orgDefaultLabel = orgHasOverdueRule
    ? formatOverdueSchedule(orgOverdueFrequency, orgOverdueInterval)
    : 'Não configurado'

  return (
    <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
      <p className="text-sm font-medium text-slate-700">Se vencer</p>
      <div className="flex flex-wrap gap-2">
        {MODE_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              value.overdueMode === option.value
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            )}
            onClick={() => onChange({ ...value, overdueMode: option.value })}
          >
            {option.label}
          </button>
        ))}
      </div>

      {value.overdueMode === 'custom' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm text-slate-600">Frequência</Label>
            <Select
              value={value.overdueFrequency}
              disabled={disabled}
              onValueChange={freq =>
                onChange({
                  ...value,
                  overdueFrequency: freq as TransactionNotifyState['overdueFrequency'],
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
            <Label className="text-sm text-slate-600">Intervalo</Label>
            <Input
              type="number"
              min={1}
              disabled={disabled}
              value={value.overdueInterval}
              onChange={e =>
                onChange({
                  ...value,
                  overdueInterval: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                })
              }
            />
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Padrão da organização: {orgDefaultLabel}
        {slug && (
          <>
            {' · '}
            <Link
              to="/$org/settings/alerts"
              params={{ org: slug }}
              className="text-slate-600 underline-offset-2 hover:underline"
            >
              Alterar em Configurações
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
