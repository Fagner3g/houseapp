import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import type { AlertRuleChannel, AlertRuleConfig, AlertRuleRecipient } from '@/db/schemas/alertRules'
import { alertRules } from '@/db/schemas/alertRules'
import { BadRequestError } from '@/http/utils/error'
import { serializeAlertRule } from '../utils'

interface UpdateRuleRequest {
  id: string
  orgId: string
  config?: AlertRuleConfig
  channels?: AlertRuleChannel[]
  recipients?: AlertRuleRecipient
  active?: boolean
}

export async function updateRuleService(input: UpdateRuleRequest) {
  const updates: Partial<typeof alertRules.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (input.config !== undefined) updates.config = input.config
  if (input.channels !== undefined) updates.channels = input.channels
  if (input.recipients !== undefined) updates.recipients = input.recipients
  if (input.active !== undefined) updates.active = input.active

  const [rule] = await db
    .update(alertRules)
    .set(updates)
    .where(and(eq(alertRules.id, input.id), eq(alertRules.organizationId, input.orgId)))
    .returning()

  if (!rule) {
    throw new BadRequestError('Rule not found')
  }

  return { rule: serializeAlertRule(rule) }
}
