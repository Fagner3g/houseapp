import type { AccountRepository } from '@/modules/accounts/account.repository'
import type { RecurringRepository } from '@/modules/recurring/recurring.repository'
import type { SplitRepository } from '@/modules/splits/split.repository'

import { hasReachedNotifyTime } from '../alert-utils'
import type { AlertRuleRecord, AlertRuleRepository } from '../alert-rule.repository'
import type { AlertSettingsService } from '../alert-settings.service'
import type { NotificationRepository } from '../notification.repository'
import {
  createAlertRule,
  deleteAlertRule,
  listAlertRules,
  updateAlertRule,
} from './crud'
import { evaluateOrganizationRules } from './evaluate'
import {
  listManualAlertTargets,
  sendManualContactAlerts,
  sendManualMemberAlerts,
  verifyOrganizationMember,
} from './manual'
import type {
  AlertEvaluateMode,
  CreateAlertRuleInput,
  EvaluateOrganizationOptions,
  ManualAlertType,
  UpdateAlertRuleInput,
} from './types'

export class AlertRuleService {
  constructor(
    private readonly alertRuleRepository: AlertRuleRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly accountRepository: AccountRepository,
    private readonly recurringRepository: RecurringRepository,
    private readonly splitRepository: SplitRepository,
    private readonly alertSettingsService: AlertSettingsService
  ) {}

  private get evaluateDeps() {
    return {
      notificationRepository: this.notificationRepository,
      splitRepository: this.splitRepository,
    }
  }

  async list(organizationId: string) {
    return listAlertRules(this.alertRuleRepository, organizationId)
  }

  async create(input: CreateAlertRuleInput) {
    return createAlertRule(
      {
        alertRuleRepository: this.alertRuleRepository,
        accountRepository: this.accountRepository,
        recurringRepository: this.recurringRepository,
      },
      input
    )
  }

  async update(organizationId: string, id: string, input: UpdateAlertRuleInput) {
    return updateAlertRule(this.alertRuleRepository, organizationId, id, input)
  }

  async delete(organizationId: string, id: string) {
    return deleteAlertRule(this.alertRuleRepository, organizationId, id)
  }

  async evaluateAll(): Promise<{ processed: number; errors: number }> {
    const activeRules = await this.alertRuleRepository.findAllActive()
    const rulesByOrg = new Map<string, AlertRuleRecord[]>()

    for (const rule of activeRules) {
      const existing = rulesByOrg.get(rule.organizationId) ?? []
      existing.push(rule)
      rulesByOrg.set(rule.organizationId, existing)
    }

    let processed = 0
    let errors = 0

    for (const [organizationId] of rulesByOrg) {
      try {
        const result = await this.evaluateOrganization(organizationId, 'all')
        processed += result.processed
      } catch {
        errors += 1
      }
    }

    return { processed, errors }
  }

  async evaluateOrganization(
    organizationId: string,
    mode: AlertEvaluateMode = 'all',
    options?: EvaluateOrganizationOptions
  ): Promise<{ processed: number; errors: number }> {
    if (!options?.skipTimeCheck) {
      const settings = await this.alertSettingsService.get(organizationId)
      if (!hasReachedNotifyTime(settings.defaultNotifyHour, settings.defaultNotifyMinute)) {
        return { processed: 0, errors: 0 }
      }
    }

    const rules = (await this.alertRuleRepository.findAllByOrganization(organizationId)).filter(
      rule => rule.isActive
    )

    if (rules.length === 0) {
      return { processed: 0, errors: 0 }
    }

    return evaluateOrganizationRules(this.evaluateDeps, organizationId, rules, mode, options)
  }

  async listManualAlertTargets(organizationId: string) {
    return listManualAlertTargets(this.splitRepository, organizationId)
  }

  async sendManualMemberAlerts(
    organizationId: string,
    userId: string,
    type: Extract<ManualAlertType, 'overdue' | 'upcoming'>
  ) {
    return sendManualMemberAlerts(this.splitRepository, organizationId, userId, type)
  }

  async sendManualContactAlerts(
    organizationId: string,
    targetKey: string,
    type: Extract<ManualAlertType, 'overdue' | 'upcoming'>
  ) {
    return sendManualContactAlerts(this.splitRepository, organizationId, targetKey, type)
  }

  async verifyOrganizationMember(organizationId: string, userId: string): Promise<void> {
    return verifyOrganizationMember(organizationId, userId)
  }
}
