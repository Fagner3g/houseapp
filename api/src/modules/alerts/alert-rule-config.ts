import type {
  AlertRuleChannel,
  AlertRuleConfig,
  AlertRuleScope,
  AlertRuleTriggerType,
  OverdueAlertConfig,
  UpcomingAlertConfig,
} from '@/db/schemas/alertRules'

/** Lightweight rule shape used by alert evaluation (no DB import). */
export type AlertRuleLike = {
  id: string
  organizationId: string
  scope: AlertRuleScope
  accountId: string | null
  recurringTransactionId: string | null
  triggerType: AlertRuleTriggerType
  config: AlertRuleConfig
  channels: AlertRuleChannel[]
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export function isUpcomingConfig(config: AlertRuleConfig): config is UpcomingAlertConfig {
  return 'daysBefore' in config
}

export function isOverdueConfig(config: AlertRuleConfig): config is OverdueAlertConfig {
  return 'frequency' in config
}
