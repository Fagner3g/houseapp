import { Bell, BriefcaseBusiness, Clock, Receipt } from 'lucide-react'

import { LoadingErrorState } from '@/components/loading-error-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/currency'
import { formatNotifyTime } from '@/lib/date'
import {
  alertStatusIconClass,
  getAlertKindBadgeVariant,
  getRuleKindBadgeVariant,
} from '@/lib/alert-status-colors'
import { useAlertSettings, useAlertsPreview, type ReminderPreviewSkipItem } from '../api'

type AlertsPreviewCardProps = {
  slug: string
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function formatDaysUntilDue(daysUntilDue: number) {
  if (daysUntilDue === 0) return 'vence hoje'
  if (daysUntilDue === 1) return 'vence amanhã'
  if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} dia(s) em atraso`
  return `vence em ${daysUntilDue} dias`
}

function formatSkippedDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatSkipReason(item: ReminderPreviewSkipItem) {
  if (item.reason === 'snoozed' && item.snoozedUntil) {
    return `adiado até ${formatSkippedDate(item.snoozedUntil)}`
  }
  if (item.reason === 'no_matching_day') {
    return `sem alerta para ${formatDaysUntilDue(item.daysUntilDue)}`
  }
  return 'fora do agendamento de hoje'
}

export function AlertsPreviewCard({ slug }: AlertsPreviewCardProps) {
  const { data, isLoading, error, refetch } = useAlertsPreview(slug)
  const { data: alertSettings } = useAlertSettings(slug)

  if (isLoading || error) {
    return <LoadingErrorState isLoading={isLoading} error={error} onRetry={refetch} />
  }

  const reminders = data?.reminders ?? []
  const skippedReminders = data?.skippedReminders ?? []
  const rules = data?.rules ?? []
  const investments = data?.investments ?? []
  const total = reminders.length + rules.length + investments.length
  const defaultNotifyHour =
    alertSettings?.defaultNotifyHour ?? data?.defaultNotifyHour ?? 9
  const defaultNotifyMinute =
    alertSettings?.defaultNotifyMinute ?? data?.defaultNotifyMinute ?? 0
  const notifyTimeLabel = formatNotifyTime(defaultNotifyHour, defaultNotifyMinute)

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximos alertas</CardTitle>
          <CardDescription>
            Nenhum alerta previsto para hoje às {notifyTimeLabel} com os lembretes e regras
            configurados.
          </CardDescription>
        </CardHeader>
        {skippedReminders.length > 0 && (
          <CardContent className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Não incluídos hoje
            </p>
            <ul className="space-y-2">
              {skippedReminders.map(item => (
                <li
                  key={item.reminderId}
                  className="flex items-start justify-between gap-3 rounded-md border border-dashed px-3 py-2 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground">
                        {formatSkipReason(item)} · {formatDaysUntilDue(item.daysUntilDue)} ·{' '}
                        {formatNotifyTime(item.notifyHour, item.notifyMinute)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {item.reason === 'snoozed' ? 'Adiado' : 'Sem alerta'}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Próximos alertas ({total})</CardTitle>
        <CardDescription>
          Alertas que seriam disparados hoje às {notifyTimeLabel} (horário configurado da
          organização).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {reminders.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Lembretes ({reminders.length})
            </p>
            <ul className="space-y-2">
              {reminders.map(item => (
                <li
                  key={item.reminderId}
                  className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${alertStatusIconClass.reminder}`} />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground">
                        {item.recipientName ?? 'Usuário'} · {formatDaysUntilDue(item.daysUntilDue)}{' '}
                        · {formatNotifyTime(item.notifyHour, item.notifyMinute)}
                      </p>
                    </div>
                  </div>
                  {item.amountCents != null && (
                    <span className="shrink-0 text-muted-foreground">
                      {formatCurrency(item.amountCents / 100)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {rules.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Regras ({rules.length})
            </p>
            <ul className="space-y-2">
              {rules.map(item => (
                <li
                  key={`${item.ruleId}-${item.occurrenceId}-${item.kind}`}
                  className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <Receipt
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        item.kind === 'upcoming'
                          ? alertStatusIconClass.upcoming
                          : alertStatusIconClass.overdue
                      }`}
                    />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground">
                        {item.recipientName ?? 'Usuário'}
                        {item.kind === 'upcoming' && item.daysUntilDue != null
                          ? ` · ${formatDaysUntilDue(item.daysUntilDue)}`
                          : item.overdueDays != null
                            ? ` · ${item.overdueDays} dia(s) em atraso`
                            : ''}
                        {' · '}
                        {notifyTimeLabel}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getRuleKindBadgeVariant(item.kind)}>
                    {item.kind === 'upcoming' ? 'Próximo' : 'Vencida'}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {investments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Aportes ({investments.length})
            </p>
            <ul className="space-y-2">
              {investments.map(item => (
                <li
                  key={`${item.planId}-${item.referenceMonth}`}
                  className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{item.assetSymbol}</p>
                      <p className="text-muted-foreground">
                        {item.recipientName ?? 'Usuário'} · {formatMonthLabel(item.referenceMonth)}
                        {' · '}
                        {notifyTimeLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {item.plannedAmount != null && (
                      <span className="text-muted-foreground">
                        {formatCurrency(item.plannedAmount)}
                      </span>
                    )}
                    <Badge variant={item.status === 'overdue' ? 'destructive' : 'warning'}>
                      {item.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {skippedReminders.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Não incluídos hoje
            </p>
            <ul className="space-y-2">
              {skippedReminders.map(item => (
                <li
                  key={item.reminderId}
                  className="flex items-start justify-between gap-3 rounded-md border border-dashed px-3 py-2 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground">
                        {formatSkipReason(item)} · {formatDaysUntilDue(item.daysUntilDue)} ·{' '}
                        {formatNotifyTime(item.notifyHour, item.notifyMinute)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {item.reason === 'snoozed' ? 'Adiado' : 'Sem alerta'}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
