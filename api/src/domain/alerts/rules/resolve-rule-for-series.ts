import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import type { AlertRuleKind } from '@/db/schemas/alertRules'
import { alertRules } from '@/db/schemas/alertRules'
import { resolveOrgAlertRule } from './resolve-org-alert-rule'

export async function resolveRuleForSeries(orgId: string, seriesId: string, kind: AlertRuleKind) {
  const [seriesRule] = await db
    .select()
    .from(alertRules)
    .where(
      and(
        eq(alertRules.organizationId, orgId),
        eq(alertRules.scope, 'series'),
        eq(alertRules.seriesId, seriesId),
        eq(alertRules.kind, kind),
        eq(alertRules.active, true)
      )
    )
    .limit(1)

  if (seriesRule) return seriesRule

  return resolveOrgAlertRule(orgId, kind, 'transaction')
}
