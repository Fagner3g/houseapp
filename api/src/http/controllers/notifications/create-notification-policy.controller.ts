import type { FastifyReply, FastifyRequest } from 'fastify'

import { createNotificationPolicyService } from '@/domain/notifications/create-notification-policy'
import type {
  CreateNotificationPolicySchemaBody,
  CreateNotificationPolicySchemaParams,
} from '@/http/schemas/notifications/create-notification-policy.schema'

interface Req
  extends FastifyRequest<{
    Params: CreateNotificationPolicySchemaParams
    Body: CreateNotificationPolicySchemaBody
  }> {}

export async function createNotificationPolicyController(request: Req, reply: FastifyReply) {
  const orgId = request.organization.id
  const {
    scope,
    event,
    days_before,
    days_overdue,
    repeat_every_minutes,
    max_occurrences,
    channels,
    active,
  } = request.body

  const { policy } = await createNotificationPolicyService({
    orgId,
    scope,
    event,
    daysBefore: days_before ?? null,
    daysOverdue: days_overdue ?? null,
    repeatEveryMinutes: repeat_every_minutes ?? null,
    maxOccurrences: max_occurrences ?? null,
    channels,
    active,
  })

  return reply.status(201).send({ policy })
}
