import type { AlertRuleKind } from '@/db/schemas/alertRules'
import type { customReminders } from '@/db/schemas/customReminders'

import { resolveReminderAlertConfig } from './resolve-reminder-alert-config'

export async function resolveReminderAlertRule(
  reminder: typeof customReminders.$inferSelect,
  kind: AlertRuleKind
) {
  const resolved = await resolveReminderAlertConfig(reminder, kind)
  if (!resolved) return null

  return {
    id: resolved.ruleId,
    channels: resolved.channels,
    config: resolved.config,
  }
}
