import type { FastifyReply, FastifyRequest } from 'fastify'

import { deleteReminderService } from '@/domain/alerts/reminders/delete-reminder'

export async function deleteReminderController(
  request: FastifyRequest<{ Params: { slug: string; id: string } }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const { id } = request.params

  await deleteReminderService({ id, orgId })

  return reply.status(204).send()
}
