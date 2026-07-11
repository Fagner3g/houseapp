import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import type {
  AlertRuleChannel,
  AlertRuleConfig,
  AlertRuleScope,
  AlertRuleTriggerType,
} from '@/db/schemas/alertRules'
import { accounts } from '@/db/schemas/accounts'
import { organizationMembers } from '@/db/schemas/organizationMembers'
import { organizations } from '@/db/schemas/organizations'
import { transactions, type TransactionNotifyOverdueConfig } from '@/db/schemas/transactions'
import { users } from '@/db/schemas/users'
import { badRequest, conflict, notFound } from '@/core/errors'
import { isNotScheduledForFutureCondition } from '@/modules/transactions/payable-transaction'
import { centavosToString } from '@/core/money'
import { UNPAID_TRANSACTION_STATUSES } from '@/core/transaction-payment'
import { normalizePhone, sendWhatsAppMessage } from '@/domain/whatsapp'
import type { AccountRepository } from '@/modules/accounts/account.repository'
import type { RecurringRepository } from '@/modules/recurring/recurring.repository'
import type { SplitRepository } from '@/modules/splits/split.repository'

import {
  buildDebtReminderTitle,
  buildOverdueRuleDedupeKey,
  buildOverdueTitle,
  buildSplitDebtTitle,
  buildSplitUpcomingDedupeKey,
  buildSplitOverdueDedupeKey,
  buildUpcomingRuleDedupeKey,
  computeDaysUntilDue,
  getOverduePeriodKey,
  hasReachedNotifyTime,
} from './alert-utils'

export type AlertEvaluateMode = 'all' | 'upcoming' | 'overdue'
import type {
  AlertRuleRecord,
  AlertRuleRepository,
} from './alert-rule.repository'
import { isOverdueConfig, isUpcomingConfig } from './alert-rule.repository'
import { resolveEffectiveOverdueNotify, type ResolvedOverdueNotify } from './resolve-effective-overdue-notify'
import { ensureDefaultOrgAlertRules } from './default-org-alert-rules'
import type { AlertSettingsService } from './alert-settings.service'
import {
  buildWhatsAppBatchMessageForTransactions,
  buildWhatsAppMessageForTransaction,
} from './build-whatsapp-transaction-message'
import type { NotificationRepository } from './notification.repository'
import { resolveSplitAlertDueDate, resolveTransactionAlertDueDate } from './resolve-transaction-alert-due-date'
import { personKey } from '@/modules/splits/split-debt-summary.logic'
import type { PendingSplitNotifyRow } from '@/modules/splits/split.repository'

export type ManualAlertType = 'overdue' | 'upcoming' | 'monthly-summary'

export type ManualAlertTarget = {
  key: string
  name: string
  type: 'member' | 'contact'
  phone: string | null
  userId: string | null
}

export type EvaluateOrganizationOptions = {
  skipTimeCheck?: boolean
  targetUserId?: string
  skipOverdueThrottle?: boolean
}

type ManualAlertItem = {
  transactionId: string
  daysUntilDue: number
  kind: 'upcoming' | 'overdue'
  overdueDays?: number
  amountOverride?: string | null
  isSplit?: boolean
  splitId?: string | null
}

export type AlertRuleDto = {
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
  createdAt: string
  updatedAt: string
}

export type CreateAlertRuleInput = {
  organizationId: string
  createdBy: string
  scope: AlertRuleScope
  accountId?: string | null
  recurringTransactionId?: string | null
  triggerType: AlertRuleTriggerType
  config: AlertRuleConfig
  channels: AlertRuleChannel[]
}

export type UpdateAlertRuleInput = {
  config?: AlertRuleConfig
  channels?: AlertRuleChannel[]
  isActive?: boolean
}

function toAlertRuleDto(rule: AlertRuleRecord): AlertRuleDto {
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

type RuleMatchTransaction = {
  id: string
  organizationId: string
  accountId: string | null
  recurringTransactionId: string | null
  title: string
  amount: bigint | null
  date: Date
}

type PendingTransactionRow = RuleMatchTransaction & {
  competenceDate: Date | null
  type: 'income' | 'expense' | 'transfer'
  installmentNumber: number | null
  accountType: string | null
  closingDay: number | null
  dueDay: number | null
  notifyEnabled: boolean
  notifyTargetType: 'member' | 'contact' | null
  notifyUserId: string | null
  notifyContactName: string | null
  notifyContactPhone: string | null
  notifyDaysBefore: number[] | null
  notifyOverdueConfig: TransactionNotifyOverdueConfig | null
}

export class AlertRuleService {
  constructor(
    private readonly alertRuleRepository: AlertRuleRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly accountRepository: AccountRepository,
    private readonly recurringRepository: RecurringRepository,
    private readonly splitRepository: SplitRepository,
    private readonly alertSettingsService: AlertSettingsService
  ) {}

  async list(organizationId: string): Promise<AlertRuleDto[]> {
    await ensureDefaultOrgAlertRules(organizationId)
    const rows = await this.alertRuleRepository.findAllByOrganization(organizationId)
    return rows.map(toAlertRuleDto)
  }

  async create(input: CreateAlertRuleInput): Promise<AlertRuleDto> {
    this.validateRuleInput(input)

    if (input.scope === 'account' && input.accountId) {
      const account = await this.accountRepository.findById(input.organizationId, input.accountId)
      if (!account?.isActive) {
        throw notFound('Account not found')
      }
    }

    if (input.scope === 'recurring' && input.recurringTransactionId) {
      const recurring = await this.recurringRepository.findById(
        input.organizationId,
        input.recurringTransactionId
      )
      if (!recurring?.isActive) {
        throw notFound('Recurring transaction not found')
      }
    }

    const existing = await this.findActiveRuleForScope(
      input.organizationId,
      input.scope,
      input.triggerType,
      input.accountId,
      input.recurringTransactionId
    )

    if (existing) {
      throw conflict('An active alert rule already exists for this scope and trigger type')
    }

    const created = await this.alertRuleRepository.create(input)
    return toAlertRuleDto(created)
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateAlertRuleInput
  ): Promise<AlertRuleDto> {
    const rule = await this.alertRuleRepository.findById(organizationId, id)

    if (!rule) {
      throw notFound('Alert rule not found')
    }

    if (input.config) {
      this.validateConfig(rule.triggerType, input.config)
    }

    const updated = await this.alertRuleRepository.update(id, input)

    if (!updated) {
      throw notFound('Alert rule not found')
    }

    return toAlertRuleDto(updated)
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const rule = await this.alertRuleRepository.findById(organizationId, id)

    if (!rule) {
      throw notFound('Alert rule not found')
    }

    await this.alertRuleRepository.delete(id)
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
      if (
        !hasReachedNotifyTime(settings.defaultNotifyHour, settings.defaultNotifyMinute)
      ) {
        return { processed: 0, errors: 0 }
      }
    }

    const rules = (await this.alertRuleRepository.findAllByOrganization(organizationId)).filter(
      rule => rule.isActive
    )

    if (rules.length === 0) {
      return { processed: 0, errors: 0 }
    }

    return this.evaluateOrganizationRules(organizationId, rules, mode, options)
  }

  async listManualAlertTargets(organizationId: string): Promise<ManualAlertTarget[]> {
    const members = await db
      .select({
        userId: users.id,
        name: users.name,
        phone: users.phone,
      })
      .from(users)
      .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, organizationId))

    const targets: ManualAlertTarget[] = members.map(member => ({
      key: personKey({ userId: member.userId, contactName: null, contactPhone: null }),
      name: member.name ?? 'Membro',
      type: 'member',
      phone: member.phone,
      userId: member.userId,
    }))

    const activeSplits = await this.splitRepository.listActivePendingSplits(organizationId)
    const seenContactKeys = new Set<string>()

    for (const split of activeSplits) {
      if (split.userId) continue

      const key = personKey(split)
      if (seenContactKeys.has(key)) continue
      seenContactKeys.add(key)

      targets.push({
        key,
        name: split.contactName ?? 'Contato',
        type: 'contact',
        phone: split.contactPhone,
        userId: null,
      })
    }

    return targets.sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
  }

  async sendManualMemberAlerts(
    organizationId: string,
    userId: string,
    type: Extract<ManualAlertType, 'overdue' | 'upcoming'>
  ): Promise<{ sent: number; errors: number; type: string }> {
    await this.verifyOrganizationMember(organizationId, userId)

    const [user] = await db
      .select({ name: users.name, phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      throw notFound('User not found')
    }

    const phone = normalizePhone(user.phone)
    if (!phone) {
      throw badRequest('Telefone do usuário vazio')
    }

    const targetKey = personKey({ userId, contactName: null, contactPhone: null })
    return this.sendManualAlertsForTarget({
      organizationId,
      targetKey,
      recipientName: user.name ?? 'você',
      phone,
      type,
    })
  }

  async sendManualContactAlerts(
    organizationId: string,
    targetKey: string,
    type: Extract<ManualAlertType, 'overdue' | 'upcoming'>
  ): Promise<{ sent: number; errors: number; type: string }> {
    if (!targetKey.startsWith('contact:')) {
      throw badRequest('Invalid contact target')
    }

    const activeSplits = await this.splitRepository.listActivePendingSplits(organizationId)
    const matchingSplits = activeSplits.filter(
      split => !split.userId && personKey(split) === targetKey
    )

    if (matchingSplits.length === 0) {
      throw notFound('Contact not found')
    }

    const sample = matchingSplits[0] as NonNullable<(typeof matchingSplits)[0]>
    const phone = normalizePhone(sample.contactPhone)
    if (!phone) {
      throw badRequest('Telefone do contato vazio')
    }

    return this.sendManualAlertsForTarget({
      organizationId,
      targetKey,
      recipientName: sample.contactName ?? 'você',
      phone,
      type,
    })
  }

  private async sendManualAlertsForTarget(params: {
    organizationId: string
    targetKey: string
    recipientName: string
    phone: string
    type: Extract<ManualAlertType, 'overdue' | 'upcoming'>
  }): Promise<{ sent: number; errors: number; type: string }> {
    const mode = params.type === 'overdue' ? 'overdue' : 'upcoming'
    const items = await this.collectManualAlertItems(
      params.organizationId,
      params.targetKey,
      mode
    )

    if (items.length === 0) {
      return { sent: 0, errors: 0, type: params.type }
    }

    if (items.length === 1) {
      const item = items[0]
      const message = await buildWhatsAppMessageForTransaction({
        recipientName: params.recipientName,
        transactionId: item.transactionId,
        daysUntilDue: item.daysUntilDue,
        kind: item.kind,
        overdueDays: item.overdueDays,
        amountOverride: item.amountOverride,
        isSplit: item.isSplit,
        splitId: item.splitId,
      })

      if (!message) {
        return { sent: 0, errors: 1, type: params.type }
      }

      const result = await sendWhatsAppMessage({ phone: params.phone, message })
      return {
        sent: result.status === 'sent' ? 1 : 0,
        errors: result.status === 'sent' ? 0 : 1,
        type: params.type,
      }
    }

    const message = await buildWhatsAppBatchMessageForTransactions({
      recipientName: params.recipientName,
      items: items.map(item => ({
        transactionId: item.transactionId,
        daysUntilDue: item.daysUntilDue,
        kind: item.kind,
        overdueDays: item.overdueDays,
        amountOverride: item.amountOverride,
        isSplit: item.isSplit,
        splitId: item.splitId,
      })),
    })

    if (!message) {
      return { sent: 0, errors: items.length, type: params.type }
    }

    const result = await sendWhatsAppMessage({ phone: params.phone, message })

    return {
      sent: result.status === 'sent' ? 1 : 0,
      errors: result.status === 'sent' ? 0 : items.length,
      type: params.type,
    }
  }

  async verifyOrganizationMember(organizationId: string, userId: string): Promise<void> {
    const [member] = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        )
      )
      .limit(1)

    if (!member) {
      throw badRequest('User is not a member of this organization')
    }
  }

  private splitMatchesTarget(
    split: PendingSplitNotifyRow,
    targetKey: string
  ): boolean {
    if (targetKey.startsWith('user:')) {
      return split.userId === targetKey.slice('user:'.length)
    }

    if (targetKey.startsWith('contact:')) {
      return !split.userId && personKey(split) === targetKey
    }

    return false
  }

  private transactionMatchesTarget(
    transaction: {
      notifyTargetType: 'member' | 'contact' | null
      notifyUserId: string | null
    },
    targetKey: string
  ): boolean {
    if (!targetKey.startsWith('user:')) {
      return false
    }

    const targetUserId = targetKey.slice('user:'.length)
    return (
      transaction.notifyTargetType === 'member' && transaction.notifyUserId === targetUserId
    )
  }

  private async collectManualAlertItems(
    organizationId: string,
    targetKey: string,
    mode: AlertEvaluateMode
  ): Promise<ManualAlertItem[]> {
    const items: ManualAlertItem[] = []
    const pendingTransactions = await this.loadPendingTransactions(organizationId)
    const activeSplits = await this.splitRepository.listActivePendingSplits(organizationId)
    const transactionIdsWithSplits = new Set(activeSplits.map(split => split.transactionId))

    for (const transaction of pendingTransactions) {
      if (transactionIdsWithSplits.has(transaction.id)) {
        continue
      }

      if (!transaction.notifyEnabled || !transaction.notifyTargetType) {
        continue
      }

      if (!this.transactionMatchesTarget(transaction, targetKey)) {
        continue
      }

      if (transaction.notifyTargetType === 'contact') {
        continue
      }

      const daysUntilDue = this.resolveDaysUntilDueForTransaction(transaction)

      if (daysUntilDue >= 0 && mode !== 'overdue') {
        items.push({
          transactionId: transaction.id,
          daysUntilDue,
          kind: 'upcoming',
        })
      } else if (daysUntilDue < 0 && mode !== 'upcoming') {
        items.push({
          transactionId: transaction.id,
          daysUntilDue,
          kind: 'overdue',
          overdueDays: Math.abs(daysUntilDue),
        })
      }
    }

    for (const split of activeSplits) {
      if (!this.splitMatchesTarget(split, targetKey)) continue

      const daysUntilDue = this.resolveDaysUntilDueForSplit(split)
      const splitAmount = centavosToString(split.amount)

      if (daysUntilDue >= 0 && mode !== 'overdue') {
        items.push({
          transactionId: split.transactionId,
          daysUntilDue,
          kind: 'upcoming',
          amountOverride: splitAmount,
          isSplit: true,
          splitId: split.id,
        })
      } else if (daysUntilDue < 0 && mode !== 'upcoming') {
        items.push({
          transactionId: split.transactionId,
          daysUntilDue,
          kind: 'overdue',
          overdueDays: Math.abs(daysUntilDue),
          amountOverride: splitAmount,
          isSplit: true,
          splitId: split.id,
        })
      }
    }

    return items
  }

  private async evaluateOrganizationRules(
    organizationId: string,
    rules: AlertRuleRecord[],
    mode: AlertEvaluateMode,
    options?: EvaluateOrganizationOptions
  ): Promise<{ processed: number; errors: number }> {
    let processed = 0

    const skipDedupe = options?.skipOverdueThrottle === true

    const pendingTransactions = await this.loadPendingTransactions(organizationId)
    const notifyingSplits = await this.splitRepository.listNotifyEnabledPending(organizationId)
    const transactionIdsWithSplits = new Set(notifyingSplits.map(split => split.transactionId))

    for (const transaction of pendingTransactions) {
      const daysUntilDue = this.resolveDaysUntilDueForTransaction(transaction)

      if (transactionIdsWithSplits.has(transaction.id)) {
        continue
      }

      if (transaction.notifyEnabled && transaction.notifyTargetType) {
        if (
          options?.targetUserId &&
          transaction.notifyTargetType === 'member' &&
          transaction.notifyUserId !== options.targetUserId
        ) {
          continue
        }
        if (options?.targetUserId && transaction.notifyTargetType === 'contact') {
          continue
        }

        if (daysUntilDue >= 0 && mode !== 'overdue') {
          processed += await this.evaluateTargetedTransaction({
            rules,
            transaction,
            daysUntilDue,
            skipDedupe,
            limitToUserId: options?.targetUserId,
          })
        } else if (daysUntilDue < 0 && mode !== 'upcoming') {
          processed += await this.evaluateTargetedOverdueTransaction({
            rules,
            transaction,
            daysUntilDue,
            skipDedupe,
            limitToUserId: options?.targetUserId,
          })
        }
      }
    }

    if (mode !== 'overdue') {
      processed += await this.evaluateSplitReminders({
        rules,
        splits: notifyingSplits,
        targetUserId: options?.targetUserId,
        skipDedupe,
      })
    }

    if (mode !== 'upcoming') {
      processed += await this.evaluateSplitOverdueReminders({
        rules,
        splits: notifyingSplits,
        targetUserId: options?.targetUserId,
        skipDedupe,
      })
    }

    return { processed, errors: 0 }
  }

  private async loadPendingTransactions(organizationId: string): Promise<PendingTransactionRow[]> {
    return db
      .select({
        id: transactions.id,
        organizationId: transactions.organizationId,
        accountId: transactions.accountId,
        recurringTransactionId: transactions.recurringTransactionId,
        title: transactions.title,
        amount: transactions.amount,
        date: transactions.date,
        competenceDate: transactions.competenceDate,
        type: transactions.type,
        installmentNumber: transactions.installmentNumber,
        accountType: accounts.type,
        closingDay: accounts.closingDay,
        dueDay: accounts.dueDay,
        notifyEnabled: transactions.notifyEnabled,
        notifyTargetType: transactions.notifyTargetType,
        notifyUserId: transactions.notifyUserId,
        notifyContactName: transactions.notifyContactName,
        notifyContactPhone: transactions.notifyContactPhone,
        notifyDaysBefore: transactions.notifyDaysBefore,
        notifyOverdueConfig: transactions.notifyOverdueConfig,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactions.status, [...UNPAID_TRANSACTION_STATUSES]),
          eq(transactions.notifyEnabled, true),
          isNotScheduledForFutureCondition()
        )
      )
  }

  private resolveDaysUntilDueForTransaction(transaction: PendingTransactionRow): number {
    return computeDaysUntilDue(this.resolveDueDateForTransaction(transaction))
  }

  private resolveDueDateForTransaction(transaction: PendingTransactionRow): Date {
    return resolveTransactionAlertDueDate({
      date: transaction.date,
      competenceDate: transaction.competenceDate,
      installmentNumber: transaction.installmentNumber,
      type: transaction.type,
      accountType: transaction.accountType,
      closingDay: transaction.closingDay,
      dueDay: transaction.dueDay,
    })
  }

  private resolveDueDateForSplit(split: PendingSplitNotifyRow): Date {
    return resolveSplitAlertDueDate({
      transactionDate: split.transactionDate,
      competenceDate: split.competenceDate,
      installmentNumber: split.installmentNumber,
      type: split.transactionType,
      accountType: split.accountType,
      closingDay: split.closingDay,
      dueDay: split.dueDay,
    })
  }

  private resolveDaysUntilDueForSplit(split: PendingSplitNotifyRow): number {
    return computeDaysUntilDue(this.resolveDueDateForSplit(split))
  }

  private resolveRule(
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

  private buildOverdueDispatchRule(params: {
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

  private async listOrganizationMemberIds(organizationId: string): Promise<string[]> {
    const rows = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId))

    return rows.map(row => row.userId)
  }

  private async createNotificationsForOrgMembers(params: {
    organizationId: string
    limitToUserId?: string
    createForUser: (userId: string) => Promise<number>
  }): Promise<number> {
    const userIds = params.limitToUserId
      ? [params.limitToUserId]
      : await this.listOrganizationMemberIds(params.organizationId)

    let created = 0
    for (const userId of userIds) {
      created += await params.createForUser(userId)
    }
    return created
  }

  private async evaluateTargetedTransaction(params: {
    rules: AlertRuleRecord[]
    transaction: PendingTransactionRow
    daysUntilDue: number
    skipDedupe?: boolean
    limitToUserId?: string
  }): Promise<number> {
    if (params.daysUntilDue < 0) return 0

    const pseudoRow = {
      id: params.transaction.id,
      organizationId: params.transaction.organizationId,
      accountId: params.transaction.accountId,
      recurringTransactionId: params.transaction.recurringTransactionId,
      title: params.transaction.title,
      amount: params.transaction.amount,
      date: params.transaction.date,
    }

    const rule = this.resolveRule(params.rules, pseudoRow, 'upcoming')
    if (!rule || !isUpcomingConfig(rule.config)) return 0

    const daysBeforeList = params.transaction.notifyDaysBefore ?? rule.config.daysBefore
    const matchingDay = daysBeforeList.find(day => day === params.daysUntilDue)
    if (matchingDay === undefined) return 0

    return this.dispatchTargetedNotification({
      rule,
      transaction: params.transaction,
      daysUntilDue: params.daysUntilDue,
      daysBefore: matchingDay,
      skipDedupe: params.skipDedupe,
      limitToUserId: params.limitToUserId,
    })
  }

  private async evaluateTargetedOverdueTransaction(params: {
    rules: AlertRuleRecord[]
    transaction: PendingTransactionRow
    daysUntilDue: number
    skipDedupe?: boolean
    limitToUserId?: string
  }): Promise<number> {
    if (params.daysUntilDue >= 0) return 0

    const pseudoRow = {
      id: params.transaction.id,
      organizationId: params.transaction.organizationId,
      accountId: params.transaction.accountId,
      recurringTransactionId: params.transaction.recurringTransactionId,
      title: params.transaction.title,
      amount: params.transaction.amount,
      date: params.transaction.date,
    }

    const orgRule = this.resolveRule(params.rules, pseudoRow, 'overdue')
    const resolved = resolveEffectiveOverdueNotify({
      txOverride: params.transaction.notifyOverdueConfig,
      orgRuleConfig: orgRule?.config,
      orgRuleId: orgRule?.id,
      orgRuleChannels: orgRule?.channels,
    })
    if (!resolved) return 0

    const rule = this.buildOverdueDispatchRule({
      organizationId: params.transaction.organizationId,
      resolved,
    })

    const overdueDays = Math.abs(params.daysUntilDue)
    const periodKey = getOverduePeriodKey(resolved.config.frequency, resolved.config.interval)
    const amount = centavosToString(params.transaction.amount)
    const dueDate = this.resolveDueDateForTransaction(params.transaction).toISOString()
    const title = buildOverdueTitle(params.transaction.title, overdueDays)
    const body = amount ? `Valor: R$ ${amount} · Vencimento: ${dueDate}` : `Vencimento: ${dueDate}`

    if (params.transaction.notifyTargetType === 'member') {
      return this.createNotificationsForOrgMembers({
        organizationId: params.transaction.organizationId,
        limitToUserId: params.limitToUserId,
        createForUser: userId =>
          this.createNotificationsForUser({
            rule,
            userId,
            transactionId: params.transaction.id,
            accountId: params.transaction.accountId,
            organizationId: params.transaction.organizationId,
            title,
            body,
            daysUntilDue: params.daysUntilDue,
            daysBefore: 0,
            dedupeKeyBuilder: (memberId, channel) =>
              buildOverdueRuleDedupeKey(
                rule.id,
                params.transaction.id,
                periodKey,
                memberId,
                channel
              ),
            metadata: {
              kind: 'overdue',
              daysUntilDue: params.daysUntilDue,
              overdueDays,
              amount,
              dueDate,
            },
            skipDedupe: params.skipDedupe,
          }),
      })
    }

    if (
      params.transaction.notifyTargetType === 'contact' &&
      params.transaction.notifyContactPhone
    ) {
      return this.createExternalNotification({
        rule,
        transactionId: params.transaction.id,
        phone: params.transaction.notifyContactPhone,
        contactName: params.transaction.notifyContactName,
        title,
        body,
        dedupeKey: `external:${params.transaction.id}:period-${periodKey}:${params.transaction.notifyContactPhone}:whatsapp`,
        metadata: {
          kind: 'overdue',
          daysUntilDue: params.daysUntilDue,
          overdueDays,
          amount,
          dueDate,
          externalPhone: params.transaction.notifyContactPhone,
          externalName: params.transaction.notifyContactName,
        },
      })
    }

    return 0
  }

  private async evaluateSplitReminders(params: {
    rules: AlertRuleRecord[]
    splits: Awaited<ReturnType<SplitRepository['listNotifyEnabledPending']>>
    targetUserId?: string
    skipDedupe?: boolean
  }): Promise<number> {
    let created = 0

    for (const split of params.splits) {
      if (params.targetUserId) {
        if (split.userId !== params.targetUserId) continue
      }
      const daysUntilDue = this.resolveDaysUntilDueForSplit(split)
      if (daysUntilDue < 0) continue

      const pseudoTransaction = {
        id: split.transactionId,
        organizationId: split.organizationId,
        accountId: null,
        recurringTransactionId: null,
        title: split.transactionTitle,
        amount: split.amount,
        date: split.transactionDate,
      }

      const rule = this.resolveRule(params.rules, pseudoTransaction, 'upcoming')
      if (!rule || !isUpcomingConfig(rule.config)) continue

      const matchingDay = rule.config.daysBefore.find(day => day === daysUntilDue)
      if (matchingDay === undefined) continue

      const splitAmount = centavosToString(split.amount)
      const dueDate = this.resolveDueDateForSplit(split).toISOString()
      const title = buildSplitDebtTitle(split.transactionTitle, daysUntilDue)
      const body = splitAmount
        ? `Valor: R$ ${splitAmount} · Vencimento: ${dueDate}`
        : `Vencimento: ${dueDate}`

      if (split.userId) {
        created += await this.createNotificationsForUser({
          rule,
          userId: split.userId,
          transactionId: split.transactionId,
          accountId: null,
          organizationId: split.organizationId,
          title,
          body,
          daysUntilDue,
          daysBefore: matchingDay,
          dedupeKeyBuilder: (userId, channel) =>
            buildSplitUpcomingDedupeKey(split.id, matchingDay, userId, channel),
          metadata: {
            kind: 'split_upcoming',
            splitId: split.id,
            daysUntilDue,
            daysBefore: matchingDay,
            amount: splitAmount,
            dueDate,
          },
          skipDedupe: params.skipDedupe,
        })
      } else if (split.contactPhone && !params.targetUserId) {
        created += await this.createExternalNotification({
          rule,
          transactionId: split.transactionId,
          phone: split.contactPhone,
          contactName: split.contactName,
          title,
          body,
          dedupeKey: buildSplitUpcomingDedupeKey(
            split.id,
            matchingDay,
            split.contactPhone,
            'whatsapp'
          ),
          metadata: {
            kind: 'split_external',
            splitId: split.id,
            daysUntilDue,
            daysBefore: matchingDay,
            amount: splitAmount,
            dueDate,
            externalPhone: split.contactPhone,
            externalName: split.contactName,
          },
          onSent: async () => {
            await this.splitRepository.update(split.id, {
              isNotified: true,
              lastNotifiedAt: new Date(),
            })
          },
        })
      }
    }

    return created
  }

  private async evaluateSplitOverdueReminders(params: {
    rules: AlertRuleRecord[]
    splits: Awaited<ReturnType<SplitRepository['listNotifyEnabledPending']>>
    targetUserId?: string
    skipDedupe?: boolean
  }): Promise<number> {
    let created = 0

    for (const split of params.splits) {
      if (params.targetUserId && split.userId !== params.targetUserId) continue

      const daysUntilDue = this.resolveDaysUntilDueForSplit(split)
      if (daysUntilDue >= 0) continue

      const pseudoTransaction = {
        id: split.transactionId,
        organizationId: split.organizationId,
        accountId: null,
        recurringTransactionId: null,
        title: split.transactionTitle,
        amount: split.amount,
        date: split.transactionDate,
      }

      const rule = this.resolveRule(params.rules, pseudoTransaction, 'overdue')
      if (!rule || !isOverdueConfig(rule.config)) continue

      const overdueDays = Math.abs(daysUntilDue)
      const periodKey = getOverduePeriodKey(rule.config.frequency, rule.config.interval)
      const splitAmount = centavosToString(split.amount)
      const dueDate = this.resolveDueDateForSplit(split).toISOString()
      const title = buildOverdueTitle(split.transactionTitle, overdueDays)
      const body = splitAmount
        ? `Valor: R$ ${splitAmount} · Vencimento: ${dueDate}`
        : `Vencimento: ${dueDate}`

      if (split.userId) {
        created += await this.createNotificationsForUser({
          rule,
          userId: split.userId,
          transactionId: split.transactionId,
          accountId: null,
          organizationId: split.organizationId,
          title,
          body,
          daysUntilDue,
          daysBefore: 0,
          dedupeKeyBuilder: (userId, channel) =>
            buildSplitOverdueDedupeKey(split.id, periodKey, userId, channel),
          metadata: {
            kind: 'split_overdue',
            splitId: split.id,
            daysUntilDue,
            overdueDays,
            amount: splitAmount,
            dueDate,
          },
          skipDedupe: params.skipDedupe,
        })
      } else if (split.contactPhone && !params.targetUserId) {
        created += await this.createExternalNotification({
          rule,
          transactionId: split.transactionId,
          phone: split.contactPhone,
          contactName: split.contactName,
          title,
          body,
          dedupeKey: buildSplitOverdueDedupeKey(
            split.id,
            periodKey,
            split.contactPhone,
            'whatsapp'
          ),
          metadata: {
            kind: 'split_external_overdue',
            splitId: split.id,
            daysUntilDue,
            overdueDays,
            amount: splitAmount,
            dueDate,
            externalPhone: split.contactPhone,
            externalName: split.contactName,
          },
        })
      }
    }

    return created
  }

  private async dispatchTargetedNotification(params: {
    rule: AlertRuleRecord
    transaction: PendingTransactionRow
    daysUntilDue: number
    daysBefore: number
    skipDedupe?: boolean
    limitToUserId?: string
  }): Promise<number> {
    const amount = centavosToString(params.transaction.amount)
    const dueDate = this.resolveDueDateForTransaction(params.transaction).toISOString()
    const title = buildDebtReminderTitle(params.transaction.title, params.daysUntilDue)
    const body = amount ? `Valor: R$ ${amount} · Vencimento: ${dueDate}` : `Vencimento: ${dueDate}`

    if (params.transaction.notifyTargetType === 'member') {
      return this.createNotificationsForOrgMembers({
        organizationId: params.transaction.organizationId,
        limitToUserId: params.limitToUserId,
        createForUser: userId =>
          this.createNotificationsForUser({
            rule: params.rule,
            userId,
            transactionId: params.transaction.id,
            accountId: params.transaction.accountId,
            organizationId: params.transaction.organizationId,
            title,
            body,
            daysUntilDue: params.daysUntilDue,
            daysBefore: params.daysBefore,
            dedupeKeyBuilder: (memberId, channel) =>
              buildUpcomingRuleDedupeKey(
                params.rule.id,
                params.transaction.id,
                params.daysBefore,
                memberId,
                channel
              ),
            metadata: {
              kind: 'targeted_upcoming',
              daysUntilDue: params.daysUntilDue,
              daysBefore: params.daysBefore,
              amount,
              dueDate,
            },
            skipDedupe: params.skipDedupe,
          }),
      })
    }

    if (
      params.transaction.notifyTargetType === 'contact' &&
      params.transaction.notifyContactPhone
    ) {
      return this.createExternalNotification({
        rule: params.rule,
        transactionId: params.transaction.id,
        phone: params.transaction.notifyContactPhone,
        contactName: params.transaction.notifyContactName,
        title,
        body,
        dedupeKey: `external:${params.transaction.id}:day-${params.daysBefore}:${params.transaction.notifyContactPhone}:whatsapp`,
        metadata: {
          kind: 'target_external',
          daysUntilDue: params.daysUntilDue,
          daysBefore: params.daysBefore,
          amount,
          dueDate,
          externalPhone: params.transaction.notifyContactPhone,
          externalName: params.transaction.notifyContactName,
        },
        onSent: async () => {
          await db
            .update(transactions)
            .set({ notifyLastNotifiedAt: new Date(), updatedAt: new Date() })
            .where(eq(transactions.id, params.transaction.id))
        },
      })
    }

    return 0
  }

  private async createNotificationsForUser(params: {
    rule: AlertRuleRecord
    userId: string
    transactionId: string
    accountId: string | null
    organizationId: string
    title: string
    body: string
    daysUntilDue: number
    daysBefore: number
    dedupeKeyBuilder: (userId: string, channel: AlertRuleChannel) => string
    metadata: Record<string, unknown>
    skipDedupe?: boolean
  }): Promise<number> {
    let created = 0

    for (const channel of params.rule.channels) {
      const dedupeKey = params.dedupeKeyBuilder(params.userId, channel)

      if (!params.skipDedupe && (await this.notificationRepository.existsByDedupeKey(dedupeKey))) {
        continue
      }

      const notification = await this.notificationRepository.create({
        organizationId: params.organizationId || params.rule.organizationId,
        userId: params.userId,
        alertRuleId: params.rule.id,
        transactionId: params.transactionId,
        accountId: params.accountId,
        title: params.title,
        body: params.body,
        channel,
        status: channel === 'in_app' || channel === 'extension' ? 'sent' : 'pending',
        sentAt: channel === 'in_app' || channel === 'extension' ? new Date() : null,
        dedupeKey,
        metadata: params.metadata,
      })

      if (notification) {
        created += 1
      }
    }

    return created
  }

  private async createExternalNotification(params: {
    rule: AlertRuleRecord
    transactionId: string
    phone: string
    contactName: string | null
    title: string
    body: string
    dedupeKey: string
    metadata: Record<string, unknown>
    onSent?: () => Promise<void>
  }): Promise<number> {
    if (!params.rule.channels.includes('whatsapp')) {
      return 0
    }

    if (await this.notificationRepository.existsByDedupeKey(params.dedupeKey)) {
      return 0
    }

    const [org] = await db
      .select({ organizationId: organizations.id, ownerId: organizations.ownerId })
      .from(transactions)
      .innerJoin(organizations, eq(transactions.organizationId, organizations.id))
      .where(eq(transactions.id, params.transactionId))
      .limit(1)

    if (!org) return 0

    const notification = await this.notificationRepository.create({
      organizationId: org.organizationId,
      userId: org.ownerId,
      alertRuleId: params.rule.id,
      transactionId: params.transactionId,
      accountId: null,
      title: params.title,
      body: params.body,
      channel: 'whatsapp',
      status: 'pending',
      sentAt: null,
      dedupeKey: params.dedupeKey,
      metadata: {
        ...params.metadata,
        externalPhone: params.phone,
        externalName: params.contactName,
      },
    })

    if (notification) {
      await params.onSent?.()
      return 1
    }

    return 0
  }

  private async findActiveRuleForScope(
    organizationId: string,
    scope: AlertRuleScope,
    triggerType: AlertRuleTriggerType,
    accountId?: string | null,
    recurringTransactionId?: string | null
  ): Promise<AlertRuleRecord | null> {
    if (scope === 'account') {
      return this.alertRuleRepository.findActiveByScope(
        organizationId,
        'account',
        triggerType,
        accountId
      )
    }

    if (scope === 'recurring') {
      return this.alertRuleRepository.findActiveByScope(
        organizationId,
        'recurring',
        triggerType,
        recurringTransactionId
      )
    }

    return this.alertRuleRepository.findActiveByScope(organizationId, 'organization', triggerType)
  }

  private validateRuleInput(input: CreateAlertRuleInput): void {
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

    this.validateConfig(input.triggerType, input.config)
  }

  private validateConfig(triggerType: AlertRuleTriggerType, config: AlertRuleConfig): void {
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
}
