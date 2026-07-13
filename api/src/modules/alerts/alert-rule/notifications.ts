import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizationMembers } from '@/db/schemas/organizationMembers'

export type {
  CreateExternalNotificationParams,
  CreateUserNotificationParams,
} from './notification-types'
export { createExternalNotification } from './create-external-notification'
export { createNotificationsForUser } from './create-user-notifications'

export async function listOrganizationMemberIds(organizationId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId))

  return rows.map(row => row.userId)
}

export async function createNotificationsForOrgMembers(params: {
  organizationId: string
  limitToUserId?: string
  createForUser: (userId: string) => Promise<number>
}): Promise<number> {
  const userIds = params.limitToUserId
    ? [params.limitToUserId]
    : await listOrganizationMemberIds(params.organizationId)

  let created = 0
  for (const userId of userIds) {
    created += await params.createForUser(userId)
  }
  return created
}
