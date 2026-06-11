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
  type OverdueRuleConfig,
  type UpcomingRuleConfig,
  useAlertRules,
  useAlertSettings,
  useUpdateAlertRule,
  useUpdateAlertSettings,
} from '../api'

const UPCOMING_DAY_OPTIONS = [7, 3, 1, 0] as const
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

export function RuleConfigForm({ slug }: RuleConfigFormProps) {
  const { data, isLoading, error, refetch } = useAlertRules(slug)
  const { data: alertSettings } = useAlertSettings(slug)
  const updateMutation = useUpdateAlertRule(slug)
  const updateSettingsMutation = useUpdateAlertSettings(slug)

  const orgRules = (data?.rules ?? []).filter(r => r.scope === 'organization' && r.active)
  const seriesRules = (data?.rules ?? []).filter(r => r.scope === 'series' && r.active)

  const upcomingRule = orgRules.find(r => r.kind === 'upcoming')
  const overdueRule = orgRules.find(r => r.kind === 'overdue')

  const [upcomingDays, setUpcomingDays] = useState<number[]>([0, 1, 2, 3, 4])
  const [overdueFrequency, setOverdueFrequency] = useState<OverdueRuleConfig['frequency']>('weekly')
  const [overdueInterval, setOverdueInterval] = useState(1)
  const [channels, setChannels] = useState<AlertRuleChannel[]>(['in_app', 'whatsapp', 'extension'])
  const [recipients, setRecipients] = useState<AlertRuleRecipient>('pay_to')
  const [defaultNotifyTime, setDefaultNotifyTime] = useState('09:00')

  useEffect(() => {
    if (alertSettings) {
      setDefaultNotifyTime(
        formatNotifyTime(alertSettings.defaultNotifyHour, alertSettings.defaultNotifyMinute)
      )
    }
  }, [alertSettings])

  useEffect(() => {
    if (upcomingRule && isUpcomingConfig(upcomingRule.config)) {
      setUpcomingDays(upcomingRule.config.daysBefore)
      setChannels(upcomingRule.channels)
      setRecipients(upcomingRule.recipients)
    }
    if (overdueRule && isOverdueConfig(overdueRule.config)) {
      setOverdueFrequency(overdueRule.config.frequency)
      setOverdueInterval(overdueRule.config.interval)
      if (!upcomingRule) {
        setChannels(overdueRule.channels)
        setRecipients(overdueRule.recipients)
      }
    }
  }, [upcomingRule, overdueRule])

  const toggleDay = (day: number) => {
    setUpcomingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => b - a)
    )
  }

  const toggleChannel = (channel: AlertRuleChannel) => {
    setChannels(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    )
  }

  const handleSave = async () => {
    if (channels.length === 0) {
      toast.error('Selecione pelo menos um canal')
      return
    }
    if (upcomingDays.length === 0) {
      toast.error('Selecione pelo menos um dia para vencimentos próximos')
      return
    }

    try {
      const { hour, minute } = parseNotifyTime(defaultNotifyTime)
      await updateSettingsMutation.mutateAsync({
        defaultNotifyHour: hour,
        defaultNotifyMinute: minute,
      })

      if (upcomingRule) {
        await updateMutation.mutateAsync({
          id: upcomingRule.id,
          data: {
            config: { daysBefore: upcomingDays },
            channels,
            recipients,
          },
        })
      }
      if (overdueRule) {
        await updateMutation.mutateAsync({
          id: overdueRule.id,
          data: {
            config: { frequency: overdueFrequency, interval: overdueInterval },
            channels,
            recipients,
          },
        })
      }
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className={`size-2 rounded-full ${alertStatusDotClass.upcoming}`} />
            Vencimentos próximos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Alertar antes do vencimento</Label>
            <div className="flex flex-wrap gap-3">
              {UPCOMING_DAY_OPTIONS.map(day => (
                <span key={day} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={upcomingDays.includes(day)}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  {day === 0 ? 'No dia' : `${day} dias antes`}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className={`size-2 rounded-full ${alertStatusDotClass.overdue}`} />
            Transações vencidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={overdueFrequency}
                onValueChange={v => setOverdueFrequency(v as OverdueRuleConfig['frequency'])}
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
                value={String(overdueInterval)}
                onValueChange={v => setOverdueInterval(Number(v))}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Canais e destinatários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Canais</Label>
            <div className="flex flex-wrap gap-3">
              {CHANNEL_OPTIONS.map(opt => (
                <span key={opt.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={channels.includes(opt.value)}
                    onCheckedChange={() => toggleChannel(opt.value)}
                  />
                  {opt.label}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Destinatários</Label>
            <Select value={recipients} onValueChange={v => setRecipients(v as AlertRuleRecipient)}>
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
        </CardContent>
      </Card>

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
