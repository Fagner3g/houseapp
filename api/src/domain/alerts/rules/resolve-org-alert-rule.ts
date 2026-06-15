import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import type { AlertRuleKind, AlertRuleTarget } from '@/db/schemas/alertRules'
import { alertRules } from '@/db/schemas/alertRules'

export async function resolveOrgAlertRule(
  orgId: string,
  kind: AlertRuleKind,
  target: AlertRuleTarget = 'transaction'
) {
  const [orgRule] = await db
    .select()
    .from(alertRules)
    .where(
      and(
        eq(alertRules.organizationId, orgId),
        eq(alertRules.scope, 'organization'),
        eq(alertRules.target, target),
        eq(alertRules.kind, kind),
        eq(alertRules.active, true)
      )
    )
    .limit(1)

  return orgRule ?? null
}
