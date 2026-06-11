import { and, eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { db } from '@/db'
import {
  DEFAULT_ALERT_PREFERENCES,
  userOrganizations,
} from '@/db/schemas/userOrganization'
import { normalizeAlertPreferences } from '@/domain/alerts/utils'
import type { UpdateUserNotificationsInputParams } from '../../schemas/user/update-user-notifications.schema'

export async function updateUserNotificationsController(
  request: FastifyRequest<{
    Params: { slug: string }
    Body: UpdateUserNotificationsInputParams
  }>,
  reply: FastifyReply
) {
  const { userId, notificationsEnabled, alertPreferences } = request.body
  const org = request.organization

  if (!org?.id) {
    return reply.status(404).send({ message: 'Organization not found' })
  }

  const [userOrg] = await db
    .select()
    .from(userOrganizations)
    .where(and(eq(userOrganizations.userId, userId), eq(userOrganizations.organizationId, org.id)))
    .limit(1)

  if (!userOrg) {
    return reply.status(404).send({ message: 'User not found in organization' })
  }

  const updates: Partial<typeof userOrganizations.$inferInsert> = {}

  if (notificationsEnabled !== undefined) {
    updates.notificationsEnabled = notificationsEnabled
  }

  if (alertPreferences !== undefined) {
    updates.alertPreferences = {
      ...normalizeAlertPreferences(userOrg.alertPreferences ?? DEFAULT_ALERT_PREFERENCES),
      ...alertPreferences,
    }
  }

  const [updated] = await db
    .update(userOrganizations)
    .set(updates)
    .where(and(eq(userOrganizations.userId, userId), eq(userOrganizations.organizationId, org.id)))
    .returning()

  return reply.status(200).send({
    userId,
    notificationsEnabled: updated.notificationsEnabled,
    alertPreferences: normalizeAlertPreferences(updated.alertPreferences),
  })
}
