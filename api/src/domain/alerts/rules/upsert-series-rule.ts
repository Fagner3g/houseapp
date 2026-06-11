import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import type { AlertRuleChannel, OverdueConfig, UpcomingConfig } from '@/db/schemas/alertRules'
import { alertRules } from '@/db/schemas/alertRules'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { BadRequestError } from '@/http/utils/error'
import { serializeAlertRule } from '../utils'

interface UpsertSeriesRuleRequest {
  orgId: string
  seriesId: string
  createdBy: string
  useOrgDefaults: boolean
  upcoming?: { daysBefore: number[] } | null
  overdue?: { frequency: 'daily' | 'weekly' | 'monthly' | 'never'; interval?: number } | null
  channels?: AlertRuleChannel[]
  recipients?: 'owner' | 'pay_to' | 'both' | 'none'
}

async function deactivateSeriesRules(orgId: string, seriesId: string) {
  await db
    .update(alertRules)
    .set({ active: false, updatedAt: new Date() })
    .where(
      and(
        eq(alertRules.organizationId, orgId),
        eq(alertRules.scope, 'series'),
        eq(alertRules.seriesId, seriesId),
        eq(alertRules.active, true)
      )
    )
}

async function upsertSeriesKindRule(
  orgId: string,
  seriesId: string,
  createdBy: string,
  kind: 'upcoming' | 'overdue',
  config: UpcomingConfig | OverdueConfig,
  channels: AlertRuleChannel[],
  recipients: 'owner' | 'pay_to' | 'both' | 'none'
) {
  const [existing] = await db
    .select()
    .from(alertRules)
    .where(
      and(
        eq(alertRules.organizationId, orgId),
        eq(alertRules.scope, 'series'),
        eq(alertRules.seriesId, seriesId),
        eq(alertRules.kind, kind)
      )
    )
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(alertRules)
      .set({
        config,
        channels,
        recipients,
        active: true,
        updatedAt: new Date(),
      })
      .where(eq(alertRules.id, existing.id))
      .returning()
    return updated
  }

  const [created] = await db
    .insert(alertRules)
    .values({
      organizationId: orgId,
      scope: 'series',
      seriesId,
      kind,
      config,
      channels,
      recipients,
      createdBy,
      active: true,
    })
    .returning()

  return created
}

export async function upsertSeriesRuleService(input: UpsertSeriesRuleRequest) {
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

  const channels = input.channels ?? ['in_app', 'whatsapp', 'extension']
  const recipients = input.recipients ?? 'pay_to'

  if (input.useOrgDefaults) {
    await deactivateSeriesRules(input.orgId, input.seriesId)
    return { rules: [], useOrgDefaults: true }
  }

  const rules = []

  if (input.upcoming?.daysBefore) {
    const rule = await upsertSeriesKindRule(
      input.orgId,
      input.seriesId,
      input.createdBy,
      'upcoming',
      { daysBefore: input.upcoming.daysBefore },
      channels,
      recipients
    )
    rules.push(serializeAlertRule(rule))
  }

  if (input.overdue?.frequency && input.overdue.frequency !== 'never') {
    const rule = await upsertSeriesKindRule(
      input.orgId,
      input.seriesId,
      input.createdBy,
      'overdue',
      {
        frequency: input.overdue.frequency,
        interval: input.overdue.interval ?? 1,
      },
      channels,
      recipients
    )
    rules.push(serializeAlertRule(rule))
  } else if (input.overdue?.frequency === 'never') {
    const [existing] = await db
      .select({ id: alertRules.id })
      .from(alertRules)
      .where(
        and(
          eq(alertRules.organizationId, input.orgId),
          eq(alertRules.scope, 'series'),
          eq(alertRules.seriesId, input.seriesId),
          eq(alertRules.kind, 'overdue')
        )
      )
      .limit(1)

    if (existing) {
      await db
        .update(alertRules)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(alertRules.id, existing.id))
    }
  }

  return { rules, useOrgDefaults: false }
}
