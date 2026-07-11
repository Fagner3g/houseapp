import type { AlertRuleConfig, AlertRuleTriggerType } from '@/db/schemas/alertRules'
import { badRequest } from '@/core/errors'

import { isOverdueConfig, isUpcomingConfig } from '../alert-rule.repository'
import type { CreateAlertRuleInput } from './types'

export function validateConfig(triggerType: AlertRuleTriggerType, config: AlertRuleConfig): void {
  if (triggerType === 'upcoming') {
    if (!isUpcomingConfig(config) || config.daysBefore.length === 0) {
      throw badRequest('Upcoming rules require config.daysBefore with at least one day')
    }
    return
  }

  if (!isOverdueConfig(config) || config.interval < 1) {
    throw badRequest('Overdue rules require config.frequency and config.interval >= 1')
  }
}

export function validateRuleInput(input: CreateAlertRuleInput): void {
  if (input.scope === 'account' && !input.accountId) {
    throw badRequest('accountId is required for account scope')
  }

  if (input.scope === 'recurring' && !input.recurringTransactionId) {
    throw badRequest('recurringTransactionId is required for recurring scope')
  }

  if (input.scope === 'organization' && (input.accountId || input.recurringTransactionId)) {
    throw badRequest('organization scope cannot include accountId or recurringTransactionId')
  }

  if (input.channels.length === 0) {
    throw badRequest('At least one channel is required')
  }

  validateConfig(input.triggerType, input.config)
}
