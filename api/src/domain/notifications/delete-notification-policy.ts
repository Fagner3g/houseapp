import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { notificationPolicies } from '@/db/schemas/notificationPolicies'

interface DeleteNotificationPolicyRequest {
  id: number
  orgId: string
}

export async function deleteNotificationPolicyService({ id, orgId }: DeleteNotificationPolicyRequest) {
  await db
    .delete(notificationPolicies)
    .where(and(eq(notificationPolicies.id, id), eq(notificationPolicies.orgId, orgId)))
}

