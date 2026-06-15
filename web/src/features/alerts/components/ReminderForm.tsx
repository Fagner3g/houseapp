import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'

import { useListUsersByOrg } from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePickerField } from '@/components/ui/date-picker-field'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { centsToNumber, numberToCents } from '@/lib/currency'
import { formatDateToIso, formatNotifyTime, parseDateFromIso, parseNotifyTime } from '@/lib/date'
import { formatOrgUserLabel, getSelectableOrgUsers } from '@/lib/org-users'
import { useAuthStore } from '@/stores/auth'
import {
  useAlertSettings,
  type CreateReminderInput,
  type Reminder,
  type ReminderChannel,
  type ReminderRecurrenceType,
} from '../api'
import { AlertScheduleFields } from './AlertScheduleFields'

const CHANNEL_OPTIONS: { value: ReminderChannel; label: string }[] = [
  { value: 'in_app', label: 'No app' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'extension', label: 'Extensão Chrome' },
]
const RECURRENCE_TYPE_OPTIONS: { value: ReminderRecurrenceType; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
]
type ReminderFormProps = {
  slug: string
  open: boolean
  onOpenChange: (open: boolean) => void
  reminder?: Reminder | null
  onSubmit: (data: CreateReminderInput) => Promise<void>
  isSubmitting?: boolean
}

export function ReminderForm({
  slug,
  open,
  onOpenChange,
  reminder,
  onSubmit,
  isSubmitting,
}: ReminderFormProps) {
  const { data: usersData } = useListUsersByOrg(slug)
  const { data: alertSettings } = useAlertSettings(slug)
  const currentUser = useAuthStore(s => s.user)
  const users = usersData?.users ?? []
  const selectableUsers = useMemo(
    () =>
      getSelectableOrgUsers(users, {
        keepUserIds: [reminder?.recipientUserId, reminder?.defaultPayToId],
      }),
    [users, reminder?.recipientUserId, reminder?.defaultPayToId]
  )
  const defaultNotifyTime = formatNotifyTime(
    alertSettings?.defaultNotifyHour ?? 9,
    alertSettings?.defaultNotifyMinute ?? 0
  )

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [amount, setAmount] = useState<number | null>(null)
  const [channels, setChannels] = useState<ReminderChannel[]>([
    'in_app',
    'whatsapp',
    'extension',
  ])
  const [recipientUserId, setRecipientUserId] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<ReminderRecurrenceType>('yearly')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceUntil, setRecurrenceUntil] = useState<Date | undefined>()
  const [notifyTime, setNotifyTime] = useState<string>('default')
  const [generatesTransaction, setGeneratesTransaction] = useState(false)
  const [defaultPayToId, setDefaultPayToId] = useState('')
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense')
  const [useOrgAlertDefaults, setUseOrgAlertDefaults] = useState(true)
  const [upcomingDays, setUpcomingDays] = useState<number[]>([1, 0])
  const [overdueFrequency, setOverdueFrequency] = useState<'daily' | 'weekly' | 'monthly'>(
    'weekly'
  )
  const [overdueInterval, setOverdueInterval] = useState(1)

  useEffect(() => {
    if (!open) return
    if (reminder) {
      setTitle(reminder.title)
      setNotes(reminder.notes ?? '')
      setDueDate(parseDateFromIso(reminder.dueDate))
      setAmount(reminder.amountCents != null ? centsToNumber(reminder.amountCents) : null)
      setChannels(reminder.channels)
      setRecipientUserId(reminder.recipientUserId)
      setIsRecurring(reminder.isRecurring)
      setRecurrenceType(reminder.recurrenceType ?? 'yearly')
      setRecurrenceInterval(reminder.recurrenceInterval)
      setRecurrenceUntil(
        reminder.recurrenceUntil ? parseDateFromIso(reminder.recurrenceUntil) : undefined
      )
      setNotifyTime(
        reminder.notifyHour != null
          ? formatNotifyTime(reminder.notifyHour, reminder.notifyMinute ?? 0)
          : 'default'
      )
      setGeneratesTransaction(reminder.generatesTransaction)
      setDefaultPayToId(reminder.defaultPayToId ?? '')
      setTransactionType(reminder.transactionType)
      setUseOrgAlertDefaults(reminder.useOrgAlertDefaults)
      setUpcomingDays(reminder.daysBefore)
      setOverdueFrequency(reminder.overdueAlertFrequency ?? 'weekly')
      setOverdueInterval(reminder.overdueAlertInterval)
    } else {
      setTitle('')
      setNotes('')
      setDueDate(dayjs().startOf('day').toDate())
      setAmount(null)
      setChannels(['in_app', 'whatsapp', 'extension'])
      setRecipientUserId(
        currentUser?.id && selectableUsers.some(user => user.id === currentUser.id)
          ? currentUser.id
          : (selectableUsers[0]?.id ?? '')
      )
      setIsRecurring(false)
      setRecurrenceType('yearly')
      setRecurrenceInterval(1)
      setRecurrenceUntil(undefined)
      setNotifyTime('default')
      setGeneratesTransaction(false)
      setDefaultPayToId('')
      setTransactionType('expense')
      setUseOrgAlertDefaults(true)
      setUpcomingDays([1, 0])
      setOverdueFrequency('weekly')
      setOverdueInterval(1)
    }
  }, [open, reminder, selectableUsers, currentUser?.id])

  const toggleChannel = (channel: ReminderChannel) => {
    setChannels(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !title.trim() ||
      !dueDate ||
      !recipientUserId ||
      (!useOrgAlertDefaults && channels.length === 0) ||
      (isRecurring && !recurrenceType) ||
      (generatesTransaction && !defaultPayToId) ||
      (!useOrgAlertDefaults && upcomingDays.length === 0)
    ) {
      return
    }

    await onSubmit({
      title: title.trim(),
      notes: notes.trim() || null,
      dueDate: formatDateToIso(dueDate),
      amountCents: amount != null ? numberToCents(amount) : null,
      ...(!useOrgAlertDefaults ? { channels } : {}),
      recipientUserId,
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType : null,
      recurrenceInterval: isRecurring ? recurrenceInterval : 1,
      recurrenceUntil:
        isRecurring && recurrenceUntil ? formatDateToIso(recurrenceUntil) : null,
      generatesTransaction,
      defaultPayToId: generatesTransaction ? defaultPayToId : null,
      transactionType,
      useOrgAlertDefaults,
      ...(!useOrgAlertDefaults
        ? {
            daysBefore: upcomingDays,
            overdueAlertFrequency: overdueFrequency,
            overdueAlertInterval: overdueInterval,
          }
        : {}),
      ...(notifyTime === 'default'
        ? { notifyHour: null, notifyMinute: null }
        : (() => {
            const { hour, minute } = parseNotifyTime(notifyTime)
            return { notifyHour: hour, notifyMinute: minute }
          })()),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pr-8">
          <DialogTitle>{reminder ? 'Editar lembrete' : 'Novo lembrete'}</DialogTitle>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="reminder-form"
              size="sm"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {reminder ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogHeader>
        <form id="reminder-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Pagar IPTU"
              required
            />
          </div>

          <DatePickerField
            label="Data de vencimento"
            value={dueDate}
            onChange={setDueDate}
          />

          <div className="space-y-2">
            <Label htmlFor="amount">
              Valor {generatesTransaction ? '(opcional — informado na conclusão)' : '(opcional)'}
            </Label>
            <CurrencyInput
              id="amount"
              value={amount}
              onValueChange={setAmount}
              allowEmpty
              placeholder={generatesTransaction ? 'Desconhecido até a fatura' : '0,00'}
            />
            {generatesTransaction && (
              <p className="text-xs text-muted-foreground">
                Ideal para faturas variáveis. O valor será informado na conclusão.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={generatesTransaction}
                onCheckedChange={checked => setGeneratesTransaction(checked === true)}
              />
              Registrar transação ao concluir
            </label>
          </div>

          {generatesTransaction && (
            <div className="space-y-4 rounded-md border p-3">
              <div className="space-y-2">
                <Label>{transactionType === 'expense' ? 'Pagar para' : 'Receber de'}</Label>
                <Select value={defaultPayToId} onValueChange={setDefaultPayToId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {formatOrgUserLabel(user, currentUser?.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={transactionType}
                  onValueChange={v => setTransactionType(v as 'expense' | 'income')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Destinatário</Label>
            <Select value={recipientUserId} onValueChange={setRecipientUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o usuário" />
              </SelectTrigger>
              <SelectContent>
                {selectableUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {formatOrgUserLabel(user, currentUser?.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Horário do alerta</Label>
            <Select value={notifyTime === 'default' ? 'default' : 'custom'} onValueChange={v => setNotifyTime(v === 'default' ? 'default' : defaultNotifyTime)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  Usar padrão da organização ({defaultNotifyTime})
                </SelectItem>
                <SelectItem value="custom">Horário personalizado</SelectItem>
              </SelectContent>
            </Select>
            {notifyTime !== 'default' && (
              <Input
                type="time"
                value={notifyTime}
                onChange={e => setNotifyTime(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={isRecurring}
                onCheckedChange={checked => setIsRecurring(checked === true)}
              />
              Lembrete recorrente
            </label>
          </div>

          {isRecurring && (
            <div className="space-y-4 rounded-md border p-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={recurrenceType}
                    onValueChange={v => setRecurrenceType(v as ReminderRecurrenceType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Intervalo</Label>
                  <Select
                    value={String(recurrenceInterval)}
                    onValueChange={v => setRecurrenceInterval(Number(v))}
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
              </div>
              <DatePickerField
                label="Repetir até (opcional)"
                value={recurrenceUntil}
                onChange={setRecurrenceUntil}
              />
            </div>
          )}

          <div className="space-y-4 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-sm font-medium">Alertas de vencimento</span>
                <p className="text-xs text-muted-foreground">
                  {useOrgAlertDefaults
                    ? 'Usando regras padrão da organização (aba Regras automáticas).'
                    : 'Regras personalizadas para este lembrete.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="use-org-alert-defaults" className="text-xs text-muted-foreground">
                  Org padrão
                </Label>
                <Switch
                  id="use-org-alert-defaults"
                  checked={useOrgAlertDefaults}
                  onCheckedChange={checked => setUseOrgAlertDefaults(checked)}
                />
              </div>
            </div>

            {!useOrgAlertDefaults && (
              <>
                <AlertScheduleFields
                  upcomingDays={upcomingDays}
                  onUpcomingDayToggle={day => {
                    setUpcomingDays(prev =>
                      prev.includes(day)
                        ? prev.filter(d => d !== day)
                        : [...prev, day].sort((a, b) => b - a)
                    )
                  }}
                  overdueFrequency={overdueFrequency}
                  onOverdueFrequencyChange={(frequency, interval) => {
                    if (frequency === 'never') return
                    setOverdueFrequency(frequency)
                    if (interval !== undefined) setOverdueInterval(interval)
                  }}
                  overdueInterval={overdueInterval}
                  hideOverdueSection
                  upcomingLabel="Marcos de alerta"
                  upcomingHelpText="Os mesmos marcos valem antes e depois do vencimento."
                />

                <div className="space-y-2">
                  <Label>Canais</Label>
                  <div className="flex flex-wrap gap-3">
                    {CHANNEL_OPTIONS.map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={channels.includes(opt.value)}
                          onCheckedChange={() => toggleChannel(opt.value)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}
