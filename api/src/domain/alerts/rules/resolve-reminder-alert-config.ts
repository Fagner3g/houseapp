import type { AlertRuleChannel, AlertRuleKind, OverdueConfig, UpcomingConfig } from '@/db/schemas/alertRules'
import type { customReminders } from '@/db/schemas/customReminders'

import { resolveOrgAlertRule } from './resolve-org-alert-rule'

export type ResolvedReminderAlert = {
  channels: AlertRuleChannel[]
  config: UpcomingConfig | OverdueConfig
  ruleId: string | null
}

export async function resolveReminderAlertConfig(
  reminder: typeof customReminders.$inferSelect,
  kind: AlertRuleKind
): Promise<ResolvedReminderAlert | null> {
  if (reminder.useOrgAlertDefaults) {
    const rule = await resolveOrgAlertRule(reminder.organizationId, kind, 'reminder')
    if (!rule) return null

    return {
      channels: rule.channels,
      config: rule.config,
      ruleId: rule.id,
    }
  }

  if (kind === 'upcoming') {
    if (reminder.daysBefore.length === 0) return null

    return {
      channels: reminder.channels,
      config: { daysBefore: reminder.daysBefore },
      ruleId: null,
    }
  }

  const frequency = reminder.overdueAlertFrequency
  if (!frequency) return null

  return {
    channels: reminder.channels,
    config: {
      frequency,
      interval: reminder.overdueAlertInterval,
    },
    ruleId: null,
  }
}
