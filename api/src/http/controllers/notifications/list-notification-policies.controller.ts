import type { FastifyReply, FastifyRequest } from 'fastify'

import { listNotificationPoliciesService } from '@/domain/notifications/list-notification-policies'
import type { ListNotificationPoliciesSchemaParams } from '@/http/schemas/notifications/list-notification-policies.schema'

type Req = FastifyRequest<{ Params: ListNotificationPoliciesSchemaParams }>

export async function listNotificationPoliciesController(request: Req, reply: FastifyReply) {
  const orgId = request.organization.id

  const { policies } = await listNotificationPoliciesService({ orgId })

  return reply.status(200).send({ policies })
}
