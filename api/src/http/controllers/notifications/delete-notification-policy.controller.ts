import type { FastifyReply, FastifyRequest } from 'fastify'

import { deleteNotificationPolicyService } from '@/domain/notifications/delete-notification-policy'
import type { DeleteNotificationPolicySchemaParams } from '@/http/schemas/notifications/delete-notification-policy.schema'

type Req = FastifyRequest<{ Params: DeleteNotificationPolicySchemaParams }>

export async function deleteNotificationPolicyController(request: Req, reply: FastifyReply) {
  const orgId = request.organization.id
  const { id } = request.params

  await deleteNotificationPolicyService({ id, orgId })

  return reply.status(200).send()
}
