import { and, eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { db } from '@/db'
import { userOrganizations } from '@/db/schemas/userOrganization'
import type { UpdateUserNotificationsInputParams } from '../../schemas/user/update-user-notifications.schema'

export async function updateUserNotificationsController(
  request: FastifyRequest<{
    Params: { slug: string }
    Body: UpdateUserNotificationsInputParams
  }>,
  reply: FastifyReply
) {
  const { userId, notificationsEnabled } = request.body
  const org = request.organization

  if (!org?.id) {
    return reply.status(404).send({ message: 'Organization not found' })
  }

  // Verificar se o usuário pertence à organização
  const userOrg = await db
    .select()
    .from(userOrganizations)
    .where(and(eq(userOrganizations.userId, userId), eq(userOrganizations.organizationId, org.id)))
    .limit(1)

  if (userOrg.length === 0) {
    return reply.status(404).send({ message: 'User not found in organization' })
  }

  // Atualizar preferência de notificação
  await db
    .update(userOrganizations)
    .set({ notificationsEnabled })
    .where(and(eq(userOrganizations.userId, userId), eq(userOrganizations.organizationId, org.id)))

  return reply.status(200).send({
    userId,
    notificationsEnabled,
  })
}
