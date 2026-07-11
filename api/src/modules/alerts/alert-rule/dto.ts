import type { AlertRuleRecord } from '../alert-rule.repository'
import type { AlertRuleDto } from './types'

export function toAlertRuleDto(rule: AlertRuleRecord): AlertRuleDto {
  return {
    id: rule.id,
    organizationId: rule.organizationId,
    scope: rule.scope,
    accountId: rule.accountId,
    recurringTransactionId: rule.recurringTransactionId,
    triggerType: rule.triggerType,
    config: rule.config,
    channels: rule.channels,
    isActive: rule.isActive,
    createdBy: rule.createdBy,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  }
}
