import { useEffect, useId, useState } from 'react'
import { toast } from 'sonner'

import {
  getListAlertRulesQueryKey,
  useCreateAlertRule,
  useDeleteAlertRule,
  useListAlertRules,
  useUpdateAlertRule,
} from '@/api/generated/api'
import { CreateAlertRuleBodyChannelsItem } from '@/api/generated/model/createAlertRuleBodyChannelsItem'
import { CreateAlertRuleBodyScope } from '@/api/generated/model/createAlertRuleBodyScope'
import type { ListAlertRules200RulesItem } from '@/api/generated/model/listAlertRules200RulesItem'
import type { UpdateAlertRuleBodyChannelsItem } from '@/api/generated/model/updateAlertRuleBodyChannelsItem'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { readHttpErrorMessage } from '@/lib/http'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

import { AlertsOperationsCard } from './alerts-operations-card'
import { AlertsScheduleCard } from './alerts-schedule-card'

const DAY_OPTIONS = [0, 1, 3, 7, 15, 30]

const CHANNEL_OPTIONS = [
  { value: CreateAlertRuleBodyChannelsItem.in_app, label: 'App' },
  { value: CreateAlertRuleBodyChannelsItem.whatsapp, label: 'WhatsApp' },
  { value: CreateAlertRuleBodyChannelsItem.extension, label: 'Extensão' },
] as const

const CHANNEL_LABELS = Object.fromEntries(CHANNEL_OPTIONS.map(ch => [ch.value, ch.label])) as Record<
  string,
  string
>

const TRIGGER_LABELS: Record<string, string> = {
  upcoming: 'Antes do vencimento',
  overdue: 'Vencidas',
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
}

const DEFAULT_CHANNELS = [
  CreateAlertRuleBodyChannelsItem.in_app,
  CreateAlertRuleBodyChannelsItem.extension,
]

type RuleType = 'upcoming' | 'overdue'

function isOrgRule(rule: ListAlertRules200RulesItem) {
  return rule.scope === 'organization'
}

function formatChannelLabels(channels: string[]) {
  return channels.map(ch => CHANNEL_LABELS[ch] ?? ch).join(', ')
}

function formatDays(days: number[]) {
  return [...days]
    .sort((a, b) => a - b)
    .map(day => (day === 0 ? 'no dia' : `${day}d`))
    .join(', ')
}

function loadFormFromRule(rule: ListAlertRules200RulesItem) {
  if (rule.triggerType === 'upcoming' && 'daysBefore' in rule.config) {
    return {
      selectedDays: [...rule.config.daysBefore].sort((a, b) => a - b),
      overdueFrequency: 'daily' as const,
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

  return null
}

function defaultFormForType(ruleType: RuleType) {
  return {
    selectedDays: [1, 3, 7],
    overdueFrequency: 'daily' as const,
    overdueInterval: 1,
    channels: [...DEFAULT_CHANNELS],
    ruleType,
  }
}

export function AlertsSettingsTab() {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const alertFormId = useId()
  const { data, isLoading } = useListAlertRules(slug, { query: { enabled: !!slug } })
  const { mutateAsync: createRule, isPending: isCreating } = useCreateAlertRule()
  const { mutateAsync: updateRule, isPending: isUpdating } = useUpdateAlertRule()
  const { mutateAsync: deleteRule } = useDeleteAlertRule()

  const [ruleType, setRuleType] = useState<RuleType>('upcoming')
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 7])
  const [overdueFrequency, setOverdueFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [overdueInterval, setOverdueInterval] = useState(1)
  const [channels, setChannels] = useState<string[]>(DEFAULT_CHANNELS)

  const rules = data?.rules ?? []
  const activeOrgRules = rules.filter(rule => isOrgRule(rule) && rule.isActive)
  const editingRule = activeOrgRules.find(rule => rule.triggerType === ruleType)
  const isSaving = isCreating || isUpdating

  useEffect(() => {
    if (!data) return

    const existing = activeOrgRules.find(rule => rule.triggerType === ruleType)
    const loaded = existing ? loadFormFromRule(existing) : null

    if (loaded) {
      setSelectedDays(loaded.selectedDays)
      setOverdueFrequency(loaded.overdueFrequency)
      setOverdueInterval(loaded.overdueInterval)
      setChannels(loaded.channels)
      return
    }

    const defaults = defaultFormForType(ruleType)
    setSelectedDays(defaults.selectedDays)
    setOverdueFrequency(defaults.overdueFrequency)
    setOverdueInterval(defaults.overdueInterval)
    setChannels(defaults.channels)
  }, [data, ruleType, activeOrgRules])

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  const toggleChannel = (channel: string) => {
    setChannels(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    )
  }

  const handleSave = async () => {
    if (!slug) return
    if (channels.length === 0) {
      toast.error('Selecione ao menos um canal')
      return
    }

    if (ruleType === 'upcoming' && selectedDays.length === 0) {
      toast.error('Selecione ao menos um dia')
      return
    }

    if (ruleType === 'overdue' && overdueInterval < 1) {
      toast.error('Intervalo inválido')
      return
    }

    const config =
      ruleType === 'upcoming'
        ? { daysBefore: selectedDays }
        : { frequency: overdueFrequency, interval: overdueInterval }

    const channelPayload = channels as CreateAlertRuleBodyChannelsItem[]

    try {
      if (editingRule) {
        await updateRule({
          slug,
          id: editingRule.id,
          data: {
            config,
            channels: channelPayload as UpdateAlertRuleBodyChannelsItem[],
          },
        })
        toast.success('Regra de alerta atualizada')
      } else {
        await createRule({
          slug,
          data: {
            scope: CreateAlertRuleBodyScope.organization,
            triggerType: ruleType,
            config,
            channels: channelPayload,
          },
        })
        toast.success('Regra de alerta criada')
      }

      queryClient.invalidateQueries({ queryKey: getListAlertRulesQueryKey(slug) })
    } catch (error) {
      const fallback = editingRule ? 'Erro ao atualizar regra' : 'Erro ao criar regra'
      toast.error(await readHttpErrorMessage(error, fallback))
    }
  }

  const handleDelete = async (rule: ListAlertRules200RulesItem) => {
    if (!slug || !confirm('Excluir esta regra?')) return
    try {
      await deleteRule({ slug, id: rule.id })
      queryClient.invalidateQueries({ queryKey: getListAlertRulesQueryKey(slug) })
      toast.success('Regra excluída')
    } catch (error) {
      toast.error(await readHttpErrorMessage(error, 'Erro ao excluir regra'))
    }
  }

  const handleEdit = (rule: ListAlertRules200RulesItem) => {
    setRuleType(rule.triggerType)
    document.getElementById('alert-rule-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-4">
      <AlertsScheduleCard />
      <AlertsOperationsCard />

      <Card id={alertFormId}>
        <CardHeader>
          <CardTitle>Regra de alerta</CardTitle>
          <CardDescription>
            Uma regra por tipo (antes do vencimento ou vencidas). Ao salvar, a configuração existente
            é atualizada automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Tipo</p>
            <div className="flex flex-wrap gap-2">
              {(['upcoming', 'overdue'] as const).map(type => {
                const hasRule = activeOrgRules.some(rule => rule.triggerType === type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRuleType(type)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition-colors',
                      ruleType === type
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {TRIGGER_LABELS[type]}
                    {hasRule ? ' · configurada' : ''}
                  </button>
                )
              })}
            </div>
          </div>

          {ruleType === 'upcoming' ? (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Dias antes</p>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition-colors',
                      selectedDays.includes(day)
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {day === 0 ? 'No dia' : `${day}d`}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select
                  value={overdueFrequency}
                  onValueChange={value =>
                    setOverdueFrequency(value as 'daily' | 'weekly' | 'monthly')
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
                  value={overdueInterval}
                  onChange={event => setOverdueInterval(Number(event.target.value) || 1)}
                />
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Canais</p>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map(ch => (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => toggleChannel(ch.value)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    channels.includes(ch.value)
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {ruleType === 'overdue' && !activeOrgRules.some(rule => rule.triggerType === 'overdue') && (
            <p className="text-xs text-slate-500">
              Sem regra de vencidas, apenas os alertas automáticos ficam desativados. O envio manual
              continua funcionando.
            </p>
          )}

          <Button className="bg-slate-900" disabled={isSaving} onClick={handleSave}>
            {editingRule ? 'Salvar alterações' : 'Criar regra'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras configuradas</CardTitle>
          <CardDescription>Regras ativas da organização</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : activeOrgRules.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma regra configurada.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {activeOrgRules.map(rule => (
                <li key={rule.id} className="flex items-start justify-between gap-3 p-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {TRIGGER_LABELS[rule.triggerType] ?? rule.triggerType}
                    </p>
                    <p className="text-sm text-slate-500">
                      {'daysBefore' in rule.config
                        ? `Dias: ${formatDays(rule.config.daysBefore)}`
                        : `${FREQUENCY_LABELS[rule.config.frequency] ?? rule.config.frequency} · a cada ${rule.config.interval}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      Canais: {formatChannelLabels(rule.channels)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(rule)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600"
                      onClick={() => handleDelete(rule)}
                    >
                      Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
