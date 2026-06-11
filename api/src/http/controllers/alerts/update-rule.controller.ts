import type { FastifyReply, FastifyRequest } from 'fastify'

import type { AlertRuleChannel, AlertRuleConfig, AlertRuleRecipient } from '@/db/schemas/alertRules'
import { updateRuleService } from '@/domain/alerts/rules/update-rule'

export async function updateRuleController(
  request: FastifyRequest<{
    Params: { slug: string; id: string }
    Body: {
      config?: AlertRuleConfig
      channels?: AlertRuleChannel[]
      recipients?: AlertRuleRecipient
      active?: boolean
    }
  }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const { id } = request.params
  const body = request.body

  const result = await updateRuleService({
    id,
    orgId,
    config: body.config,
    channels: body.channels,
    recipients: body.recipients,
    active: body.active,
  })

  return reply.status(200).send(result)
}
