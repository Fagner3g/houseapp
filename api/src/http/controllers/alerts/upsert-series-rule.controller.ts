import type { FastifyReply, FastifyRequest } from 'fastify'

import type { AlertRuleChannel } from '@/db/schemas/alertRules'
import { upsertSeriesRuleService } from '@/domain/alerts/rules/upsert-series-rule'

export async function upsertSeriesRuleController(
  request: FastifyRequest<{
    Params: { slug: string; seriesId: string }
    Body: {
      useOrgDefaults: boolean
      upcoming?: { daysBefore: number[] } | null
      overdue?: {
        frequency: 'daily' | 'weekly' | 'monthly' | 'never'
        interval?: number
      } | null
      channels?: AlertRuleChannel[]
      recipients?: 'owner' | 'pay_to' | 'both' | 'none'
    }
  }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const userId = request.user.sub
  const { seriesId } = request.params
  const body = request.body

  const result = await upsertSeriesRuleService({
    orgId,
    seriesId,
    createdBy: userId,
    useOrgDefaults: body.useOrgDefaults,
    upcoming: body.upcoming,
    overdue: body.overdue,
    channels: body.channels,
    recipients: body.recipients,
  })

  return reply.status(200).send(result)
}
