import type { FastifyReply, FastifyRequest } from 'fastify'

import { previewInvestmentAlerts } from '@/domain/alerts/evaluator/evaluate-investment-reminders'
import { previewReminderAlerts } from '@/domain/alerts/evaluator/evaluate-reminders'
import { previewTransactionRuleAlerts } from '@/domain/alerts/evaluator/evaluate-transaction-rules'
import { getAlertSettingsService } from '@/domain/alerts/settings/get-alert-settings'

export async function previewAlertsController(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id

  const [{ settings }, reminders, rules, investments] = await Promise.all([
    getAlertSettingsService(orgId),
    previewReminderAlerts(orgId),
    previewTransactionRuleAlerts(orgId),
    previewInvestmentAlerts(orgId),
  ])

  return reply.status(200).send({
    defaultNotifyHour: settings.defaultNotifyHour,
    defaultNotifyMinute: settings.defaultNotifyMinute,
    reminders: reminders.items,
    skippedReminders: reminders.skipped,
    rules: rules.items,
    investments: investments.items,
  })
}
