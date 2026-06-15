import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { LoadingErrorState } from '@/components/loading-error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatNotifyTime, parseNotifyTime } from '@/lib/date'
import { alertStatusDotClass, getRuleKindBadgeVariant } from '@/lib/alert-status-colors'
import {
  type AlertRule,
  type AlertRuleChannel,
  type AlertRuleRecipient,
  type AlertRuleTarget,
  type OverdueRuleConfig,
  type UpcomingRuleConfig,
  useAlertRules,
  useAlertSettings,
  useUpdateAlertRule,
  useUpdateAlertSettings,
} from '../api'
import { UPCOMING_DAY_OPTIONS } from './AlertScheduleFields'

const CHANNEL_OPTIONS: { value: AlertRuleChannel; label: string }[] = [
  { value: 'in_app', label: 'No app' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'extension', label: 'Extensão Chrome' },
]
const RECIPIENT_OPTIONS: { value: AlertRuleRecipient; label: string }[] = [
  { value: 'pay_to', label: 'Responsável (Receber de / Pagar para)' },
  { value: 'owner', label: 'Quem cadastrou' },
  { value: 'both', label: 'Ambos' },
]
type RuleConfigFormProps = {
  slug: string
}

function isUpcomingConfig(config: AlertRule['config']): config is UpcomingRuleConfig {
  return 'daysBefore' in config
}

function isOverdueConfig(config: AlertRule['config']): config is OverdueRuleConfig {
  return 'frequency' in config
}

type TargetRuleState = {
  upcomingDays: number[]
  overdueFrequency: OverdueRuleConfig['frequency']
  overdueInterval: number
  channels: AlertRuleChannel[]
  recipients: AlertRuleRecipient
}

const DEFAULT_TARGET_STATE: TargetRuleState = {
  upcomingDays: [0, 1, 2, 3, 4],
  overdueFrequency: 'weekly',
  overdueInterval: 1,
  channels: ['in_app', 'whatsapp', 'extension'],
  recipients: 'pay_to',
}

function findOrgRules(rules: AlertRule[], target: AlertRuleTarget) {
  const orgRules = rules.filter(
    r => r.scope === 'organization' && r.active && r.target === target
  )
  return {
    upcoming: orgRules.find(r => r.kind === 'upcoming'),
    overdue: orgRules.find(r => r.kind === 'overdue'),
  }
}

function stateFromRules(upcoming?: AlertRule, overdue?: AlertRule): TargetRuleState {
  const state = { ...DEFAULT_TARGET_STATE }

  if (upcoming && isUpcomingConfig(upcoming.config)) {
    state.upcomingDays = upcoming.config.daysBefore
    state.channels = upcoming.channels
    state.recipients = upcoming.recipients
  }
  if (overdue && isOverdueConfig(overdue.config)) {
    state.overdueFrequency = overdue.config.frequency
    state.overdueInterval = overdue.config.interval
    if (!upcoming) {
      state.channels = overdue.channels
      state.recipients = overdue.recipients
    }
  }

  return state
}

export function RuleConfigForm({ slug }: RuleConfigFormProps) {
  const { data, isLoading, error, refetch } = useAlertRules(slug)
  const { data: alertSettings } = useAlertSettings(slug)
  const updateMutation = useUpdateAlertRule(slug)
  const updateSettingsMutation = useUpdateAlertSettings(slug)

  const rules = data?.rules ?? []
  const seriesRules = rules.filter(r => r.scope === 'series' && r.active)
  const transactionRules = findOrgRules(rules, 'transaction')
  const reminderRules = findOrgRules(rules, 'reminder')

  const [transactionState, setTransactionState] = useState<TargetRuleState>(DEFAULT_TARGET_STATE)
  const [reminderState, setReminderState] = useState<TargetRuleState>(DEFAULT_TARGET_STATE)
  const [defaultNotifyTime, setDefaultNotifyTime] = useState('09:00')

  useEffect(() => {
    if (alertSettings) {
      setDefaultNotifyTime(
        formatNotifyTime(alertSettings.defaultNotifyHour, alertSettings.defaultNotifyMinute)
      )
    }
  }, [alertSettings])

  useEffect(() => {
    setTransactionState(
      stateFromRules(transactionRules.upcoming, transactionRules.overdue)
    )
    setReminderState(stateFromRules(reminderRules.upcoming, reminderRules.overdue))
  }, [data])

  const toggleDay = (target: AlertRuleTarget, day: number) => {
    const setter = target === 'transaction' ? setTransactionState : setReminderState
    setter(prev => ({
      ...prev,
      upcomingDays: prev.upcomingDays.includes(day)
        ? prev.upcomingDays.filter(d => d !== day)
        : [...prev.upcomingDays, day].sort((a, b) => b - a),
    }))
  }

  const updateOverdue = (
    target: AlertRuleTarget,
    frequency: OverdueRuleConfig['frequency'],
    interval?: number
  ) => {
    const setter = target === 'transaction' ? setTransactionState : setReminderState
    setter(prev => ({
      ...prev,
      overdueFrequency: frequency,
      overdueInterval: interval ?? prev.overdueInterval,
    }))
  }

  const toggleChannel = (target: AlertRuleTarget, channel: AlertRuleChannel) => {
    const setter = target === 'transaction' ? setTransactionState : setReminderState
    setter(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel],
    }))
  }

  const setRecipients = (target: AlertRuleTarget, recipients: AlertRuleRecipient) => {
    const setter = target === 'transaction' ? setTransactionState : setReminderState
    setter(prev => ({ ...prev, recipients }))
  }

  const saveTargetRules = async (
    state: TargetRuleState,
    upcomingRule?: AlertRule,
    overdueRule?: AlertRule
  ) => {
    if (upcomingRule) {
      await updateMutation.mutateAsync({
        id: upcomingRule.id,
        data: {
          config: { daysBefore: state.upcomingDays },
          channels: state.channels,
          recipients: state.recipients,
        },
      })
    }
    if (overdueRule) {
      await updateMutation.mutateAsync({
        id: overdueRule.id,
        data: {
          config: { frequency: state.overdueFrequency, interval: state.overdueInterval },
          channels: state.channels,
          recipients: state.recipients,
        },
      })
    }
  }

  const handleSave = async () => {
    if (transactionState.channels.length === 0 || reminderState.channels.length === 0) {
      toast.error('Selecione pelo menos um canal')
      return
    }
    if (transactionState.upcomingDays.length === 0 || reminderState.upcomingDays.length === 0) {
      toast.error('Selecione pelo menos um dia para vencimentos próximos')
      return
    }

    try {
      const { hour, minute } = parseNotifyTime(defaultNotifyTime)
      await updateSettingsMutation.mutateAsync({
        defaultNotifyHour: hour,
        defaultNotifyMinute: minute,
      })

      await saveTargetRules(
        transactionState,
        transactionRules.upcoming,
        transactionRules.overdue
      )
      await saveTargetRules(reminderState, reminderRules.upcoming, reminderRules.overdue)

      toast.success('Regras atualizadas')
    } catch {
      toast.error('Erro ao salvar regras')
    }
  }

  if (isLoading || error) {
    return (
      <LoadingErrorState
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        loadingMessage="Carregando regras..."
      />
    )
  }

  const renderUpcomingCard = (
    target: AlertRuleTarget,
    title: string,
    state: TargetRuleState
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={`size-2 rounded-full ${alertStatusDotClass.upcoming}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Alertar antes do vencimento</Label>
          <div className="flex flex-wrap gap-3">
            {UPCOMING_DAY_OPTIONS.map(day => (
              <span key={day} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={state.upcomingDays.includes(day)}
                  onCheckedChange={() => toggleDay(target, day)}
                />
                {day === 0 ? 'No dia' : `${day} dias antes`}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderOverdueCard = (
    target: AlertRuleTarget,
    title: string,
    state: TargetRuleState
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={`size-2 rounded-full ${alertStatusDotClass.overdue}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Frequência</Label>
            <Select
              value={state.overdueFrequency}
              onValueChange={v =>
                updateOverdue(target, v as OverdueRuleConfig['frequency'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Intervalo</Label>
            <Select
              value={String(state.overdueInterval)}
              onValueChange={v => updateOverdue(target, state.overdueFrequency, Number(v))}
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
      </CardContent>
    </Card>
  )

  const renderChannelsCard = (
    target: AlertRuleTarget,
    state: TargetRuleState,
    showRecipients: boolean
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Canais{showRecipients ? ' e destinatários' : ''}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Canais</Label>
          <div className="flex flex-wrap gap-3">
            {CHANNEL_OPTIONS.map(opt => (
              <span key={opt.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={state.channels.includes(opt.value)}
                  onCheckedChange={() => toggleChannel(target, opt.value)}
                />
                {opt.label}
              </span>
            ))}
          </div>
        </div>
        {showRecipients ? (
          <div className="space-y-2">
            <Label>Destinatários</Label>
            <Select
              value={state.recipients}
              onValueChange={v => setRecipients(target, v as AlertRuleRecipient)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECIPIENT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Lembretes usam o destinatário definido em cada lembrete.
          </p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-end border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || updateSettingsMutation.isPending}
          isLoading={updateMutation.isPending || updateSettingsMutation.isPending}
        >
          Salvar regras
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horário dos alertas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultNotifyTime">Horário padrão dos alertas</Label>
            <Input
              id="defaultNotifyTime"
              type="time"
              value={defaultNotifyTime}
              onChange={e => setDefaultNotifyTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Lembretes e regras automáticas disparam neste horário (America/Sao_Paulo).
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Transações</h3>
        {renderUpcomingCard('transaction', 'Vencimentos próximos', transactionState)}
        {renderOverdueCard('transaction', 'Transações vencidas', transactionState)}
        {renderChannelsCard('transaction', transactionState, true)}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Lembretes</h3>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className={`size-2 rounded-full ${alertStatusDotClass.upcoming}`} />
              Calendário de alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Alertar antes e depois do vencimento</Label>
              <p className="text-xs text-muted-foreground">
                Os mesmos marcos (7, 3, 1, no dia) valem antes e depois do vencimento. Ex.: com 1
                dia marcado, o alerta dispara 1 dia antes e 1 dia em atraso.
              </p>
              <div className="flex flex-wrap gap-3">
                {UPCOMING_DAY_OPTIONS.map(day => (
                  <span key={day} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={reminderState.upcomingDays.includes(day)}
                      onCheckedChange={() => toggleDay('reminder', day)}
                    />
                    {day === 0 ? 'No dia' : `${day} dias`}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        {renderChannelsCard('reminder', reminderState, false)}
      </div>

      {seriesRules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personalizações por transação</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Transação</TableHead>
                  <TableHead className="text-right">Regra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seriesRules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      {rule.seriesTitle ?? rule.seriesId}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getRuleKindBadgeVariant(rule.kind)}>
                        {rule.kind === 'upcoming' ? 'Próximos' : 'Vencidas'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
