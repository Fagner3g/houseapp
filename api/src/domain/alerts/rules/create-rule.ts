import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import type {
  AlertRuleChannel,
  AlertRuleConfig,
  AlertRuleKind,
  AlertRuleRecipient,
  AlertRuleScope,
} from '@/db/schemas/alertRules'
import { alertRules } from '@/db/schemas/alertRules'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { BadRequestError } from '@/http/utils/error'
import { serializeAlertRule } from '../utils'

interface CreateRuleRequest {
  orgId: string
  createdBy: string
  scope: AlertRuleScope
  seriesId?: string | null
  kind: AlertRuleKind
  config: AlertRuleConfig
  channels: AlertRuleChannel[]
  recipients: AlertRuleRecipient
}

export async function createRuleService(input: CreateRuleRequest) {
  if (input.scope === 'series' && !input.seriesId) {
    throw new BadRequestError('seriesId is required for series scope rules')
  }

  if (input.scope === 'organization' && input.seriesId) {
    throw new BadRequestError('seriesId must be null for organization scope rules')
  }

  if (input.seriesId) {
    const [series] = await db
      .select({ id: transactionSeries.id })
      .from(transactionSeries)
      .where(
        and(
          eq(transactionSeries.id, input.seriesId),
          eq(transactionSeries.organizationId, input.orgId)
        )
      )
      .limit(1)

    if (!series) {
      throw new BadRequestError('Series not found in organization')
    }
  }

  const scopeCondition =
    input.scope === 'organization'
      ? eq(alertRules.scope, 'organization')
      : input.seriesId
        ? and(eq(alertRules.scope, 'series'), eq(alertRules.seriesId, input.seriesId))
        : eq(alertRules.scope, 'series')

  const [existing] = await db
    .select({ id: alertRules.id })
    .from(alertRules)
    .where(
      and(
        eq(alertRules.organizationId, input.orgId),
        eq(alertRules.kind, input.kind),
        eq(alertRules.active, true),
        scopeCondition
      )
    )
    .limit(1)

  if (existing) {
    throw new BadRequestError('An active rule already exists for this scope and kind')
  }

  const [rule] = await db
    .insert(alertRules)
    .values({
      organizationId: input.orgId,
      scope: input.scope,
      seriesId: input.scope === 'series' ? input.seriesId : null,
      kind: input.kind,
      config: input.config,
      channels: input.channels,
      recipients: input.recipients,
      createdBy: input.createdBy,
    })
    .returning()

  return { rule: serializeAlertRule(rule) }
}
