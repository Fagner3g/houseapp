import type { AlertRuleTriggerType } from '@/db/schemas/alertRules'

import type { AlertRuleRecord } from '../../alert-rule.repository'
import type { ResolvedOverdueNotify } from '../../resolve-effective-overdue-notify'
import type { RuleMatchTransaction } from '../types'

export function resolveRule(
  rules: AlertRuleRecord[],
  transaction: RuleMatchTransaction,
  triggerType: AlertRuleTriggerType
): AlertRuleRecord | null {
  const scoped = rules.filter(rule => rule.triggerType === triggerType && rule.isActive)

  if (transaction.recurringTransactionId) {
    const recurringRule = scoped.find(
      rule =>
        rule.scope === 'recurring' &&
        rule.recurringTransactionId === transaction.recurringTransactionId
    )
    if (recurringRule) return recurringRule
  }

  if (transaction.accountId) {
    const accountRule = scoped.find(
      rule => rule.scope === 'account' && rule.accountId === transaction.accountId
    )
    if (accountRule) return accountRule
  }

  return scoped.find(rule => rule.scope === 'organization') ?? null
}

export function buildOverdueDispatchRule(params: {
  organizationId: string
  resolved: ResolvedOverdueNotify
}): AlertRuleRecord {
  return {
    id: params.resolved.ruleId,
    organizationId: params.organizationId,
    scope: 'organization',
    accountId: null,
    recurringTransactionId: null,
    triggerType: 'overdue',
    config: params.resolved.config,
    channels: params.resolved.channels,
    isActive: true,
    createdBy: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
