import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { ListUsersByOrg200 } from '@/api/generated/model'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  type AlertRuleRecipient,
  type UpsertSeriesRuleInput,
  useAlertRules,
  useUpsertSeriesAlertRule,
} from '@/features/alerts/api'
import { useActiveOrganization } from '@/hooks/use-active-organization'

const UPCOMING_DAY_OPTIONS = [7, 3, 1, 0] as const
const DEFAULT_RECIPIENTS: AlertRuleRecipient = 'pay_to'

export type TransactionAlertRecipient = AlertRuleRecipient | 'none'

export type TransactionAlertConfig = {
  useOrgDefaults: boolean
  recipients: TransactionAlertRecipient
  upcomingDays: number[]
  overdueFrequency: 'daily' | 'weekly' | 'monthly' | 'never'
  overdueInterval: number
}

export function isTransactionAlertCustomized(config: TransactionAlertConfig): boolean {
  return (
    !config.useOrgDefaults ||
    config.recipients !== DEFAULT_RECIPIENTS ||
    config.recipients === 'none'
  )
}

export function buildUpsertPayload(config: TransactionAlertConfig): UpsertSeriesRuleInput {
  if (config.useOrgDefaults) {
    return { useOrgDefaults: true }
  }

  const recipients =
    config.recipients === 'none' ? ('none' as AlertRuleRecipient) : config.recipients

  return {
    useOrgDefaults: false,
    recipients,
    upcoming: { daysBefore: config.upcomingDays },
    overdue: { frequency: config.overdueFrequency, interval: config.overdueInterval },
  }
}

function resolvePayToLabel(
  payToEmail: string,
  currentUserEmail: string | undefined,
  users: ListUsersByOrg200 | undefined
): string {
  if (payToEmail && currentUserEmail && payToEmail === currentUserEmail) {
    return 'Você'
  }
  const user = users?.users?.find(u => u.email === payToEmail)
  return user?.name ?? payToEmail ?? 'Responsável'
}

function resolveRecipientPreview(
  recipients: TransactionAlertRecipient,
  payToLabel: string,
  ownerName?: string
): string {
  switch (recipients) {
    case 'pay_to':
      return payToLabel
    case 'owner':
      return ownerName ?? 'Quem cadastrou'
    case 'both':
      return 'Ambos'
    case 'none':
      return ''
  }
}

interface Props {
  seriesId?: string
  disabled?: boolean
  payToEmail: string
  currentUserEmail?: string
  ownerName?: string
  users?: ListUsersByOrg200
  onConfigChange?: (config: TransactionAlertConfig) => void
}

export function AlertFrequencyField({
  seriesId,
  disabled,
  payToEmail,
  currentUserEmail,
  ownerName,
  users,
  onConfigChange,
}: Props) {
  const { slug } = useActiveOrganization()
  const { data } = useAlertRules(slug, seriesId ? 'series' : 'organization')
  const upsertMutation = useUpsertSeriesAlertRule(slug, seriesId ?? '')

  const orgRules = (data?.rules ?? []).filter(r => r.scope === 'organization' && r.active)
  const seriesRules = seriesId
    ? (data?.rules ?? []).filter(r => r.seriesId === seriesId && r.active)
    : []

  const upcomingRule = seriesRules.find(r => r.kind === 'upcoming')
  const overdueRule = seriesRules.find(r => r.kind === 'overdue')
  const orgUpcomingRule = orgRules.find(r => r.kind === 'upcoming')

  const [useOrgDefaults, setUseOrgDefaults] = useState(true)
  const [recipients, setRecipients] = useState<TransactionAlertRecipient>(DEFAULT_RECIPIENTS)
  const [upcomingDays, setUpcomingDays] = useState<number[]>([1, 0])
  const [overdueFrequency, setOverdueFrequency] = useState<
    'daily' | 'weekly' | 'monthly' | 'never'
  >('weekly')
  const [overdueInterval, setOverdueInterval] = useState(1)

  useEffect(() => {
    if (!seriesId) return

    const hasOverride = seriesRules.length > 0
    setUseOrgDefaults(!hasOverride)

    const ruleWithRecipients = upcomingRule ?? overdueRule
    if (ruleWithRecipients) {
      setRecipients(ruleWithRecipients.recipients)
    } else if (orgUpcomingRule) {
      setRecipients(orgUpcomingRule.recipients)
    } else {
      setRecipients(DEFAULT_RECIPIENTS)
    }

    if (upcomingRule && 'daysBefore' in upcomingRule.config) {
      setUpcomingDays(upcomingRule.config.daysBefore)
    } else if (orgUpcomingRule && 'daysBefore' in orgUpcomingRule.config) {
      setUpcomingDays(orgUpcomingRule.config.daysBefore)
    }

    if (overdueRule && 'frequency' in overdueRule.config) {
      setOverdueFrequency(overdueRule.config.frequency)
      setOverdueInterval(overdueRule.config.interval)
    }
  }, [seriesId, seriesRules, upcomingRule, overdueRule, orgUpcomingRule])

  const config = useMemo<TransactionAlertConfig>(
    () => ({
      useOrgDefaults,
      recipients,
      upcomingDays,
      overdueFrequency,
      overdueInterval,
    }),
    [useOrgDefaults, recipients, upcomingDays, overdueFrequency, overdueInterval]
  )

  useEffect(() => {
    if (!seriesId) {
      onConfigChange?.(config)
    }
  }, [seriesId, config, onConfigChange])

  const payToLabel = resolvePayToLabel(payToEmail, currentUserEmail, users)
  const previewName = resolveRecipientPreview(recipients, payToLabel, ownerName)

  const save = async (nextConfig: TransactionAlertConfig) => {
    if (!seriesId) return

    try {
      await upsertMutation.mutateAsync(buildUpsertPayload(nextConfig))
    } catch {
      toast.error('Erro ao salvar alertas da transação')
    }
  }

  const applyConfig = async (nextConfig: TransactionAlertConfig) => {
    setUseOrgDefaults(nextConfig.useOrgDefaults)
    setRecipients(nextConfig.recipients)
    setUpcomingDays(nextConfig.upcomingDays)
    setOverdueFrequency(nextConfig.overdueFrequency)
    setOverdueInterval(nextConfig.overdueInterval)

    if (seriesId) {
      await save(nextConfig)
    }
  }

  const handleToggleOrgDefaults = async (checked: boolean) => {
    const next: TransactionAlertConfig = {
      ...config,
      useOrgDefaults: checked,
      recipients: checked ? DEFAULT_RECIPIENTS : config.recipients,
    }
    await applyConfig(next)
  }

  const handleRecipientsChange = async (value: TransactionAlertRecipient) => {
    const next: TransactionAlertConfig = {
      ...config,
      recipients: value,
      useOrgDefaults: value === 'none' ? false : config.useOrgDefaults,
    }
    if (value !== DEFAULT_RECIPIENTS || value === 'none') {
      next.useOrgDefaults = false
    }
    await applyConfig(next)
  }

  const handleUpcomingDayToggle = async (day: number) => {
    const next = upcomingDays.includes(day)
      ? upcomingDays.filter(d => d !== day)
      : [...upcomingDays, day].sort((a, b) => b - a)
    setUpcomingDays(next)
    if (!useOrgDefaults && next.length > 0) {
      await save({ ...config, upcomingDays: next })
    }
  }

  const handleOverdueChange = async (
    frequency: 'daily' | 'weekly' | 'monthly' | 'never',
    interval?: number
  ) => {
    const nextInterval = interval ?? overdueInterval
    setOverdueFrequency(frequency)
    if (interval !== undefined) setOverdueInterval(interval)
    if (!useOrgDefaults) {
      await save({
        ...config,
        overdueFrequency: frequency,
        overdueInterval: nextInterval,
      })
    }
  }

  const handlePersonalize = async () => {
    await applyConfig({ ...config, useOrgDefaults: false })
  }

  const isPending = seriesId ? upsertMutation.isPending : false

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-sm font-medium">Alertas de vencimento</span>
          <p className="text-xs text-muted-foreground">
            {useOrgDefaults
              ? 'Usando regras padrão da organização.'
              : 'Regras personalizadas para esta transação.'}
          </p>
        </div>
        {seriesId && (
          <div className="flex items-center gap-2">
            <Label htmlFor="use-org-rules" className="text-xs text-muted-foreground">
              Org padrão
            </Label>
            <Switch
              id="use-org-rules"
              checked={useOrgDefaults}
              onCheckedChange={handleToggleOrgDefaults}
              disabled={disabled || isPending}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Quem recebe o alerta</Label>
        <Select
          value={recipients}
          onValueChange={v => handleRecipientsChange(v as TransactionAlertRecipient)}
          disabled={disabled || isPending}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pay_to">{payToLabel}</SelectItem>
            <SelectItem value="owner">Quem cadastrou</SelectItem>
            <SelectItem value="both">Ambos</SelectItem>
            <SelectItem value="none">Desativar alertas</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {recipients === 'none'
            ? 'Alertas desabilitados para esta transação.'
            : `Alertas serão enviados para ${previewName}`}
        </p>
      </div>

      {!useOrgDefaults && recipients !== 'none' && (
        <div className="space-y-4 rounded-lg border p-3">
          <div className="space-y-2">
            <Label className="text-xs">Vencimentos próximos</Label>
            <div className="flex flex-wrap gap-3">
              {UPCOMING_DAY_OPTIONS.map(day => (
                <span key={day} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={upcomingDays.includes(day)}
                    onCheckedChange={() => handleUpcomingDayToggle(day)}
                    disabled={disabled || isPending}
                  />
                  {day === 0 ? 'No dia' : `${day} dias antes`}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Vencidas — frequência</Label>
              <Select
                value={overdueFrequency}
                onValueChange={v =>
                  handleOverdueChange(v as 'daily' | 'weekly' | 'monthly' | 'never')
                }
                disabled={disabled || isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Nunca</SelectItem>
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
                  onValueChange={v => handleOverdueChange(overdueFrequency, Number(v))}
                  disabled={disabled || isPending}
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
        </div>
      )}

      {useOrgDefaults && recipients !== 'none' && !disabled && (
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={handlePersonalize}
          disabled={isPending}
        >
          Personalizar para esta transação
        </button>
      )}
    </div>
  )
}
