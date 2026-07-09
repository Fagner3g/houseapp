import { Bell, ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { useListAlertRules, useListUsersByOrg } from '@/api/generated/api'
import type { GetTransaction200Transaction } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { formatPhoneInput, normalizePhoneDigits } from '@/lib/phone'
import { cn } from '@/lib/utils'

const DAY_OPTIONS = [0, 1, 3, 7, 15, 30]

export type NotifyTargetMode = 'member' | 'contact'

export type TransactionNotifyState = {
  notifyEnabled: boolean
  targetMode: NotifyTargetMode
  notifyUserId: string | null
  notifyContactName: string
  notifyContactPhone: string
  notifyDaysBefore: number[]
}

export const defaultNotifyState = (daysBefore: number[] = [1, 3, 7]): TransactionNotifyState => ({
  notifyEnabled: false,
  targetMode: 'member',
  notifyUserId: null,
  notifyContactName: '',
  notifyContactPhone: '',
  notifyDaysBefore: daysBefore,
})

export function notifyStateFromTransaction(
  tx: Pick<
    GetTransaction200Transaction,
    | 'notifyEnabled'
    | 'notifyTargetType'
    | 'notifyUserId'
    | 'notifyContactName'
    | 'notifyContactPhone'
    | 'notifyDaysBefore'
  >,
  orgDefaults: number[]
): TransactionNotifyState {
  if (!tx.notifyEnabled) {
    return defaultNotifyState(orgDefaults)
  }

  return {
    notifyEnabled: true,
    targetMode: tx.notifyTargetType === 'contact' ? 'contact' : 'member',
    notifyUserId: tx.notifyUserId,
    notifyContactName: tx.notifyContactName ?? '',
    notifyContactPhone: formatPhoneInput(tx.notifyContactPhone ?? ''),
    notifyDaysBefore: tx.notifyDaysBefore?.length ? tx.notifyDaysBefore : orgDefaults,
  }
}

export function buildNotifyApiPayload(state: TransactionNotifyState) {
  if (!state.notifyEnabled) {
    return { notifyEnabled: false as const }
  }

  if (state.targetMode === 'member' && state.notifyUserId) {
    return {
      notifyEnabled: true as const,
      notifyTargetType: 'member' as const,
      notifyUserId: state.notifyUserId,
      notifyContactName: null,
      notifyContactPhone: null,
      notifyDaysBefore: state.notifyDaysBefore,
    }
  }

  if (state.targetMode === 'contact' && state.notifyContactName.trim()) {
    return {
      notifyEnabled: true as const,
      notifyTargetType: 'contact' as const,
      notifyUserId: null,
      notifyContactName: state.notifyContactName.trim(),
      notifyContactPhone: normalizePhoneDigits(state.notifyContactPhone) || null,
      notifyDaysBefore: state.notifyDaysBefore,
    }
  }

  return { notifyEnabled: false as const }
}

interface TransactionRemindersSectionProps {
  value: TransactionNotifyState
  onChange: (value: TransactionNotifyState) => void
  disabled?: boolean
}

export function TransactionRemindersSection({
  value,
  onChange,
  disabled = false,
}: TransactionRemindersSectionProps) {
  const { slug } = useActiveOrganization()
  const [open, setOpen] = useState(value.notifyEnabled)

  const { data: membersData } = useListUsersByOrg(slug, {
    query: { enabled: !!slug && open },
  })
  const { data: rulesData } = useListAlertRules(slug, {
    query: { enabled: !!slug && open },
  })

  const orgRule = rulesData?.rules?.find(
    rule => rule.scope === 'organization' && rule.triggerType === 'upcoming' && rule.isActive
  )
  const orgDefaultDays =
    orgRule?.config && 'daysBefore' in orgRule.config ? orgRule.config.daysBefore : [1, 3, 7]

  const members = membersData?.users ?? []

  const toggleDay = (day: number) => {
    const next = value.notifyDaysBefore.includes(day)
      ? value.notifyDaysBefore.filter(d => d !== day)
      : [...value.notifyDaysBefore, day].sort((a, b) => a - b)
    onChange({ ...value, notifyDaysBefore: next })
  }

  const selectedMemberName = members.find(member => member.id === value.notifyUserId)?.name

  return (
    <div className="rounded-lg border border-slate-200">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed"
        onClick={() => setOpen(v => !v)}
        disabled={disabled}
      >
        <span className="flex items-center gap-2">
          <Bell className="size-4" />
          Lembretes
          {value.notifyEnabled && selectedMemberName && (
            <Badge variant="secondary" className="ml-1 font-normal">
              {selectedMemberName}
            </Badge>
          )}
        </span>
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="notify-enabled" className="text-sm text-slate-700">
              Enviar lembretes antes do vencimento
            </Label>
            <Switch
              id="notify-enabled"
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
                    onChange({
                      ...value,
                      targetMode: mode as NotifyTargetMode,
                    })
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

              {value.targetMode === 'member' && (
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">Membro da casa</Label>
                  <Select
                    value={value.notifyUserId ?? ''}
                    onValueChange={userId => onChange({ ...value, notifyUserId: userId })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um membro" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {value.targetMode === 'contact' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600">Nome</Label>
                    <Input
                      value={value.notifyContactName}
                      onChange={e =>
                        onChange({ ...value, notifyContactName: e.target.value })
                      }
                      placeholder="Nome do contato"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600">Telefone (WhatsApp)</Label>
                    <PhoneInput
                      value={value.notifyContactPhone}
                      onValueChange={notifyContactPhone =>
                        onChange({ ...value, notifyContactPhone })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Avisar com antecedência</p>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map(day => (
                    <button
                      key={day}
                      type="button"
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        value.notifyDaysBefore.includes(day)
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      )}
                      onClick={() => toggleDay(day)}
                    >
                      {day === 0 ? 'No dia' : `${day}d`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Padrão da organização: {orgDefaultDays.map(d => (d === 0 ? 'no dia' : `${d}d`)).join(', ')}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
