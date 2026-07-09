import { Bell, ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { useListAlertRules, useListUsersByOrg } from '@/api/generated/api'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { MemberSelect } from '@/features/accounts/components/member-select'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { formatPhoneInput } from '@/lib/phone'
import { cn } from '@/lib/utils'

import { OverdueBlock } from './overdue-block'
import { UpcomingBlock } from './upcoming-block'
import {
  DEFAULT_UPCOMING_DAYS,
  orgNotifyDefaultsFromRules,
  type OrgNotifyDefaults,
  type TransactionNotifyState,
} from './types'

export type { TransactionNotifyState, OrgNotifyDefaults } from './types'
export {
  buildNotifyApiPayload,
  defaultNotifyState,
  defaultOrgNotifyDefaults,
  notifyStateFromTransaction,
  orgNotifyDefaultsFromRules,
} from './types'

interface TransactionRemindersSectionProps {
  value: TransactionNotifyState
  onChange: (value: TransactionNotifyState) => void
  orgDefaults?: OrgNotifyDefaults
  disabled?: boolean
}

export function TransactionRemindersSection({
  value,
  onChange,
  orgDefaults: orgDefaultsProp,
  disabled = false,
}: TransactionRemindersSectionProps) {
  const { slug } = useActiveOrganization()
  const [open, setOpen] = useState(value.notifyEnabled)

  const { data: membersData } = useListUsersByOrg(slug, {
    query: { enabled: !!slug },
  })
  const { data: rulesData } = useListAlertRules(slug, {
    query: { enabled: !!slug && open && !orgDefaultsProp },
  })

  const orgDefaults = orgDefaultsProp ?? orgNotifyDefaultsFromRules(rulesData?.rules, {
    upcomingDays: DEFAULT_UPCOMING_DAYS,
    hasOverdueRule: false,
    overdueFrequency: 'daily',
    overdueInterval: 1,
  })

  const selectedMemberName = value.notifyUserId
    ? membersData?.users?.find(member => member.id === value.notifyUserId)?.name
    : undefined

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
          <UpcomingBlock
            value={value}
            onChange={onChange}
            orgDefaultDays={orgDefaults.upcomingDays}
            disabled={disabled}
          />

          {value.notifyEnabled && value.targetMode === 'member' && (
            <MemberSelect
              creatable
              excludeCurrentUser={false}
              label="Membro da casa"
              placeholder="Selecione um membro"
              value={value.notifyUserId}
              disabled={disabled}
              onChange={userId => onChange({ ...value, notifyUserId: userId })}
            />
          )}

          {value.notifyEnabled && value.targetMode === 'contact' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Nome</Label>
                <Input
                  value={value.notifyContactName}
                  disabled={disabled}
                  onChange={e => onChange({ ...value, notifyContactName: e.target.value })}
                  placeholder="Nome do contato"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Telefone (WhatsApp)</Label>
                <PhoneInput
                  value={value.notifyContactPhone}
                  disabled={disabled}
                  onValueChange={notifyContactPhone =>
                    onChange({ ...value, notifyContactPhone: formatPhoneInput(notifyContactPhone) })
                  }
                />
              </div>
            </div>
          )}

          {value.notifyEnabled && (
            <OverdueBlock
              value={value}
              onChange={onChange}
              orgHasOverdueRule={orgDefaults.hasOverdueRule}
              orgOverdueFrequency={orgDefaults.overdueFrequency ?? 'daily'}
              orgOverdueInterval={orgDefaults.overdueInterval ?? 1}
              disabled={disabled}
            />
          )}
        </div>
      )}
    </div>
  )
}
