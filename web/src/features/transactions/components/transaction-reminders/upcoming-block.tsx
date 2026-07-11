import { useId } from 'react'
import { Link } from '@tanstack/react-router'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { formatNotifyDays } from '@/features/transactions/lib/notify-labels'
import { cn } from '@/lib/utils'

import { DayOptions } from './day-options'
import type { NotifyDaysMode, NotifyTargetMode, TransactionNotifyState } from './types'

type UpcomingBlockProps = {
  value: TransactionNotifyState
  onChange: (value: TransactionNotifyState) => void
  orgDefaultDays: number[]
  disabled?: boolean
}

const MODE_OPTIONS: { value: NotifyDaysMode; label: string }[] = [
  { value: 'organization', label: 'Padrão da organização' },
  { value: 'custom', label: 'Personalizado' },
]

export function UpcomingBlock({
  value,
  onChange,
  orgDefaultDays,
  disabled = false,
}: UpcomingBlockProps) {
  const { slug } = useActiveOrganization()
  const notifyId = useId()

  const toggleDay = (day: number) => {
    const next = value.notifyDaysBefore.includes(day)
      ? value.notifyDaysBefore.filter(d => d !== day)
      : [...value.notifyDaysBefore, day].sort((a, b) => a - b)
    onChange({ ...value, notifyDaysBefore: next })
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={notifyId} className="text-sm text-slate-700">
          Enviar lembretes antes do vencimento
        </Label>
        <Switch
          id={notifyId}
          checked={value.notifyEnabled}
          disabled={disabled}
          onCheckedChange={checked =>
            onChange({
              ...value,
              notifyEnabled: checked,
              targetMode: checked ? value.targetMode : 'member',
            })
          }
        />
      </div>

      {value.notifyEnabled && (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Quem deve pagar / quitar este valor?
            </p>
            <ToggleGroup
              type="single"
              value={value.targetMode}
              onValueChange={mode => {
                if (!mode) return
                onChange({ ...value, targetMode: mode as NotifyTargetMode })
              }}
              className="flex w-full flex-wrap justify-start gap-2"
            >
              <ToggleGroupItem value="member" className="px-3 text-xs">
                Membro
              </ToggleGroupItem>
              <ToggleGroupItem value="contact" className="px-3 text-xs">
                Contato externo
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Avisar com antecedência</p>
            <div className="flex flex-wrap gap-2">
              {MODE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    value.notifyDaysMode === option.value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  )}
                  onClick={() =>
                    onChange({
                      ...value,
                      notifyDaysMode: option.value,
                      notifyDaysBefore:
                        option.value === 'organization'
                          ? orgDefaultDays
                          : value.notifyDaysBefore,
                    })
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            {value.notifyDaysMode === 'custom' && (
              <DayOptions
                selectedDays={value.notifyDaysBefore}
                onToggle={toggleDay}
                disabled={disabled}
              />
            )}
            <p className="text-xs text-slate-500">
              Padrão da organização: {formatNotifyDays(orgDefaultDays)}
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
        </>
      )}
    </div>
  )
}
