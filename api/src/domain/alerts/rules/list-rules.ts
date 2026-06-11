import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { alertRules } from '@/db/schemas/alertRules'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { serializeAlertRule } from '../utils'

interface ListRulesRequest {
  orgId: string
  scope?: 'organization' | 'series'
}

export async function listRulesService({ orgId, scope }: ListRulesRequest) {
  const conditions = [eq(alertRules.organizationId, orgId)]
  if (scope) {
    conditions.push(eq(alertRules.scope, scope))
  }

  const rows = await db
    .select({
      rule: alertRules,
      seriesTitle: transactionSeries.title,
    })
    .from(alertRules)
    .leftJoin(transactionSeries, eq(alertRules.seriesId, transactionSeries.id))
    .where(and(...conditions))
    .orderBy(desc(alertRules.updatedAt))

  return {
    rules: rows.map(row =>
      serializeAlertRule({
        ...row.rule,
        seriesTitle: row.seriesTitle,
      })
    ),
  }
}
