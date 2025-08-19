import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { notificationPolicies } from '@/db/schemas/notificationPolicies'

export interface ListNotificationPoliciesRequest {
  orgId: string
}

export async function listNotificationPoliciesService({ orgId }: ListNotificationPoliciesRequest) {
  const policies = await db
    .select({
      id: notificationPolicies.id,
      scope: notificationPolicies.scope,
      event: notificationPolicies.event,
      days_before: notificationPolicies.daysBefore,
      days_overdue: notificationPolicies.daysOverdue,
      repeat_every_minutes: notificationPolicies.repeatEveryMinutes,
      max_occurrences: notificationPolicies.maxOccurrences,
      channels: notificationPolicies.channels,
      active: notificationPolicies.active,
    })
    .from(notificationPolicies)
    .where(eq(notificationPolicies.orgId, orgId))
    .orderBy(notificationPolicies.id)

  return { policies }
}
