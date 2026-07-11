import type {
  AlertRuleScope,
  AlertRuleTriggerType,
} from '@/db/schemas/alertRules'
import { conflict, notFound } from '@/core/errors'
import type { AccountRepository } from '@/modules/accounts/account.repository'
import type { RecurringRepository } from '@/modules/recurring/recurring.repository'

import type { AlertRuleRecord, AlertRuleRepository } from '../alert-rule.repository'
import { ensureDefaultOrgAlertRules } from '../default-org-alert-rules'
import { toAlertRuleDto } from './dto'
import type { AlertRuleDto, CreateAlertRuleInput, UpdateAlertRuleInput } from './types'
import { validateConfig, validateRuleInput } from './validate'

export async function findActiveRuleForScope(
  alertRuleRepository: AlertRuleRepository,
  organizationId: string,
  scope: AlertRuleScope,
  triggerType: AlertRuleTriggerType,
  accountId?: string | null,
  recurringTransactionId?: string | null
): Promise<AlertRuleRecord | null> {
  if (scope === 'account') {
    return alertRuleRepository.findActiveByScope(
      organizationId,
      'account',
      triggerType,
      accountId
    )
  }

  if (scope === 'recurring') {
    return alertRuleRepository.findActiveByScope(
      organizationId,
      'recurring',
      triggerType,
      recurringTransactionId
    )
  }

  return alertRuleRepository.findActiveByScope(organizationId, 'organization', triggerType)
}

export async function listAlertRules(
  alertRuleRepository: AlertRuleRepository,
  organizationId: string
): Promise<AlertRuleDto[]> {
  await ensureDefaultOrgAlertRules(organizationId)
  const rows = await alertRuleRepository.findAllByOrganization(organizationId)
  return rows.map(toAlertRuleDto)
}

export async function createAlertRule(
  deps: {
    alertRuleRepository: AlertRuleRepository
    accountRepository: AccountRepository
    recurringRepository: RecurringRepository
  },
  input: CreateAlertRuleInput
): Promise<AlertRuleDto> {
  validateRuleInput(input)

  if (input.scope === 'account' && input.accountId) {
    const account = await deps.accountRepository.findById(input.organizationId, input.accountId)
    if (!account?.isActive) {
      throw notFound('Account not found')
    }
  }

  if (input.scope === 'recurring' && input.recurringTransactionId) {
    const recurring = await deps.recurringRepository.findById(
      input.organizationId,
      input.recurringTransactionId
    )
    if (!recurring?.isActive) {
      throw notFound('Recurring transaction not found')
    }
  }

  const existing = await findActiveRuleForScope(
    deps.alertRuleRepository,
    input.organizationId,
    input.scope,
    input.triggerType,
    input.accountId,
    input.recurringTransactionId
  )

  if (existing) {
    throw conflict('An active alert rule already exists for this scope and trigger type')
  }

  const created = await deps.alertRuleRepository.create(input)
  return toAlertRuleDto(created)
}

export async function updateAlertRule(
  alertRuleRepository: AlertRuleRepository,
  organizationId: string,
  id: string,
  input: UpdateAlertRuleInput
): Promise<AlertRuleDto> {
  const rule = await alertRuleRepository.findById(organizationId, id)
  if (!rule) throw notFound('Alert rule not found')

  if (input.config) {
    validateConfig(rule.triggerType, input.config)
  }

  const updated = await alertRuleRepository.update(id, input)
  if (!updated) throw notFound('Alert rule not found')

  return toAlertRuleDto(updated)
}

export async function deleteAlertRule(
  alertRuleRepository: AlertRuleRepository,
  organizationId: string,
  id: string
): Promise<void> {
  const rule = await alertRuleRepository.findById(organizationId, id)
  if (!rule) throw notFound('Alert rule not found')
  await alertRuleRepository.delete(id)
}
