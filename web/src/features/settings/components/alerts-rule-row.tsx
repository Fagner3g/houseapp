import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  getListAlertRulesQueryKey,
  useUpdateAlertRule,
} from '@/api/generated/api'
import type { ListAlertRules200RulesItem } from '@/api/generated/model/listAlertRules200RulesItem'
import type { UpdateAlertRuleBodyChannelsItem } from '@/api/generated/model/updateAlertRuleBodyChannelsItem'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatNotifyDays, formatOverdueSchedule } from '@/features/transactions/lib/notify-labels'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { readHttpErrorMessage } from '@/lib/http'
import { getRuleKindBadgeVariant } from '@/lib/alert-status-colors'
import { useQueryClient } from '@tanstack/react-query'

import { formatChannelLabels, TRIGGER_LABELS } from '../lib/alert-labels'
import { AlertsRuleForm, loadRuleDraft, type RuleDraft } from './alerts-rule-form'

type AlertsRuleRowProps = {
  rule: ListAlertRules200RulesItem
}

function formatRuleSummary(rule: ListAlertRules200RulesItem): string {
  if (rule.triggerType === 'upcoming' && 'daysBefore' in rule.config) {
    return `${formatNotifyDays(rule.config.daysBefore)} · ${formatChannelLabels(rule.channels)}`
  }

  if (rule.triggerType === 'overdue' && 'frequency' in rule.config) {
    return `${formatOverdueSchedule(rule.config.frequency, rule.config.interval)} · ${formatChannelLabels(rule.channels)}`
  }

  return formatChannelLabels(rule.channels)
}

export function AlertsRuleRow({ rule }: AlertsRuleRowProps) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const { mutateAsync: updateRule, isPending } = useUpdateAlertRule()

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<RuleDraft>(() => loadRuleDraft(rule))

  const triggerType = rule.triggerType as 'upcoming' | 'overdue'

  const openEditor = () => {
    setDraft(loadRuleDraft(rule))
    setIsEditing(true)
  }

  const closeEditor = () => {
    setDraft(loadRuleDraft(rule))
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!slug) return

    if (draft.channels.length === 0) {
      toast.error('Selecione ao menos um canal')
      return
    }

    if (rule.triggerType === 'upcoming' && draft.selectedDays.length === 0) {
      toast.error('Selecione ao menos um dia')
      return
    }

    const config =
      rule.triggerType === 'upcoming'
        ? { daysBefore: draft.selectedDays }
        : { frequency: draft.overdueFrequency, interval: draft.overdueInterval }

    try {
      await updateRule({
        slug,
        id: rule.id,
        data: {
          config,
          channels: draft.channels as UpdateAlertRuleBodyChannelsItem[],
        },
      })
      queryClient.invalidateQueries({ queryKey: getListAlertRulesQueryKey(slug) })
      toast.success('Regra de alerta atualizada')
      setIsEditing(false)
    } catch (error) {
      toast.error(await readHttpErrorMessage(error, 'Erro ao atualizar regra'))
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">{TRIGGER_LABELS[triggerType]}</p>
            <Badge variant={getRuleKindBadgeVariant(triggerType)}>{triggerType === 'upcoming' ? 'Antes' : 'Vencidas'}</Badge>
          </div>
          <p className="text-sm text-slate-500">{formatRuleSummary(rule)}</p>
        </div>
        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={openEditor}
            aria-label={`Editar regra ${TRIGGER_LABELS[triggerType]}`}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>

      {isEditing && (
        <AlertsRuleForm
          rule={rule}
          draft={draft}
          isSaving={isPending}
          onChange={setDraft}
          onCancel={closeEditor}
          onSave={() => void handleSave()}
        />
      )}
    </div>
  )
}
