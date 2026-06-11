import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { alertRules } from '@/db/schemas/alertRules'
import { BadRequestError } from '@/http/utils/error'

interface DeleteRuleRequest {
  id: string
  orgId: string
}

export async function deleteRuleService({ id, orgId }: DeleteRuleRequest) {
  const [rule] = await db
    .delete(alertRules)
    .where(and(eq(alertRules.id, id), eq(alertRules.organizationId, orgId)))
    .returning({ id: alertRules.id })

  if (!rule) {
    throw new BadRequestError('Rule not found')
  }
}
