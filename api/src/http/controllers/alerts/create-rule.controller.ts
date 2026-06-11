import type { FastifyReply, FastifyRequest } from 'fastify'

import type {
  AlertRuleChannel,
  AlertRuleConfig,
  AlertRuleKind,
  AlertRuleRecipient,
  AlertRuleScope,
} from '@/db/schemas/alertRules'
import { createRuleService } from '@/domain/alerts/rules/create-rule'

export async function createRuleController(
  request: FastifyRequest<{
    Params: { slug: string }
    Body: {
      scope: AlertRuleScope
      seriesId?: string | null
      kind: AlertRuleKind
      config: AlertRuleConfig
      channels: AlertRuleChannel[]
      recipients: AlertRuleRecipient
    }
  }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const userId = request.user.sub
  const body = request.body

  const result = await createRuleService({
    orgId,
    createdBy: userId,
    scope: body.scope,
    seriesId: body.seriesId,
    kind: body.kind,
    config: body.config,
    channels: body.channels,
    recipients: body.recipients,
  })

  return reply.status(201).send(result)
}
