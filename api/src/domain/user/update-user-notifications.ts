import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  DEFAULT_ALERT_PREFERENCES,
  organizationMembers,
  type AlertPreferences,
} from '@/db/schemas/organizationMembers'
import { normalizeAlertPreferences } from '@/modules/alerts/alert-preferences'

interface UpdateUserNotificationsInput {
  orgId: string
  userId: string
  notificationsEnabled?: boolean
  alertPreferences?: Partial<AlertPreferences>
}

export async function updateUserNotifications({
  orgId,
  userId,
  notificationsEnabled,
  alertPreferences,
}: UpdateUserNotificationsInput) {
  const [membership] = await db
    .select({
      notificationsEnabled: organizationMembers.notificationsEnabled,
      alertPreferences: organizationMembers.alertPreferences,
    })
    .from(organizationMembers)
    .where(
      and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, orgId))
    )
    .limit(1)

  if (!membership) return null

  const updates: Partial<typeof organizationMembers.$inferInsert> = {}

  if (notificationsEnabled !== undefined) {
    updates.notificationsEnabled = notificationsEnabled
  }

  if (alertPreferences !== undefined) {
    updates.alertPreferences = {
      ...normalizeAlertPreferences(membership.alertPreferences ?? DEFAULT_ALERT_PREFERENCES),
      ...alertPreferences,
    }
  }

  const [updated] = await db
    .update(organizationMembers)
    .set(updates)
    .where(
      and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, orgId))
    )
    .returning({
      notificationsEnabled: organizationMembers.notificationsEnabled,
      alertPreferences: organizationMembers.alertPreferences,
    })

  if (!updated) return null

  return {
    userId,
    notificationsEnabled: updated.notificationsEnabled,
    alertPreferences: normalizeAlertPreferences(updated.alertPreferences),
  }
}
