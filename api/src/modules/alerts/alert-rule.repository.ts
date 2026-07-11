import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  alertRules,
  type AlertRuleChannel,
  type AlertRuleConfig,
  type AlertRuleScope,
  type AlertRuleTriggerType,
} from '@/db/schemas/alertRules'

export type AlertRuleRecord = typeof alertRules.$inferSelect

export type CreateAlertRuleData = {
  organizationId: string
  scope: AlertRuleScope
  accountId?: string | null
  recurringTransactionId?: string | null
  triggerType: AlertRuleTriggerType
  config: AlertRuleConfig
  channels: AlertRuleChannel[]
  createdBy: string
}

export type UpdateAlertRuleData = {
  config?: AlertRuleConfig
  channels?: AlertRuleChannel[]
  isActive?: boolean
}

export interface AlertRuleRepository {
  findAllByOrganization(organizationId: string): Promise<AlertRuleRecord[]>
  findAllActive(): Promise<AlertRuleRecord[]>
  findById(organizationId: string, id: string): Promise<AlertRuleRecord | null>
  findActiveByScope(
    organizationId: string,
    scope: AlertRuleScope,
    triggerType: AlertRuleTriggerType,
    scopeId?: string | null
  ): Promise<AlertRuleRecord | null>
  create(data: CreateAlertRuleData): Promise<AlertRuleRecord>
  update(id: string, data: UpdateAlertRuleData): Promise<AlertRuleRecord | null>
  delete(id: string): Promise<AlertRuleRecord | null>
}

export class DrizzleAlertRuleRepository implements AlertRuleRepository {
  async findAllByOrganization(organizationId: string): Promise<AlertRuleRecord[]> {
    return db
      .select()
      .from(alertRules)
      .where(eq(alertRules.organizationId, organizationId))
      .orderBy(alertRules.createdAt)
  }

  async findAllActive(): Promise<AlertRuleRecord[]> {
    return db.select().from(alertRules).where(eq(alertRules.isActive, true))
  }

  async findById(organizationId: string, id: string): Promise<AlertRuleRecord | null> {
    const [rule] = await db
      .select()
      .from(alertRules)
      .where(and(eq(alertRules.id, id), eq(alertRules.organizationId, organizationId)))
      .limit(1)

    return rule ?? null
  }

  async findActiveByScope(
    organizationId: string,
    scope: AlertRuleScope,
    triggerType: AlertRuleTriggerType,
    scopeId?: string | null
  ): Promise<AlertRuleRecord | null> {
    const conditions = [
      eq(alertRules.organizationId, organizationId),
      eq(alertRules.scope, scope),
      eq(alertRules.triggerType, triggerType),
      eq(alertRules.isActive, true),
    ]

    if (scope === 'account' && scopeId) {
      conditions.push(eq(alertRules.accountId, scopeId))
    }

    if (scope === 'recurring' && scopeId) {
      conditions.push(eq(alertRules.recurringTransactionId, scopeId))
    }

    const [rule] = await db
      .select()
      .from(alertRules)
      .where(and(...conditions))
      .limit(1)

    return rule ?? null
  }

  async create(data: CreateAlertRuleData): Promise<AlertRuleRecord> {
    const [created] = await db
      .insert(alertRules)
      .values({
        organizationId: data.organizationId,
        scope: data.scope,
        accountId: data.accountId ?? null,
        recurringTransactionId: data.recurringTransactionId ?? null,
        triggerType: data.triggerType,
        config: data.config,
        channels: data.channels,
        createdBy: data.createdBy,
      })
      .returning()

    return created
  }

  async update(id: string, data: UpdateAlertRuleData): Promise<AlertRuleRecord | null> {
    const [updated] = await db
      .update(alertRules)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(alertRules.id, id))
      .returning()

    return updated ?? null
  }

  async delete(id: string): Promise<AlertRuleRecord | null> {
    const [deleted] = await db.delete(alertRules).where(eq(alertRules.id, id)).returning()
    return deleted ?? null
  }
}

export { isOverdueConfig, isUpcomingConfig } from './alert-rule-config'
