import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import { eq } from 'drizzle-orm'

import { container } from '@/core/container'
import { db } from '@/db'
import { users } from '@/db/schemas/users'
import { normalizePhone, sendWhatsAppMessage } from '@/domain/whatsapp'
import { logger } from '@/lib/logger'

import type { CreateAlertRuleBody, EvaluateAlertRulesBody, SendManualAlertBody, UpdateAlertRuleBody } from './alert-rule.schema'

type OrgParams = { slug: string }
type AlertRuleParams = OrgParams & { id: string }

export async function listAlertRulesController(
  request: FastifyRequest<{ Params: OrgParams }>,
  reply: FastifyReply
) {
  const rules = await container.alertRuleService.list(request.organization.id)
  return reply.send({ rules })
}

export async function createAlertRuleController(
  request: FastifyRequest<{ Params: OrgParams; Body: CreateAlertRuleBody }>,
  reply: FastifyReply
) {
  const rule = await container.alertRuleService.create({
    organizationId: request.organization.id,
    createdBy: request.user.sub,
    ...request.body,
  })

  return reply.status(StatusCodes.CREATED).send({ rule })
}

export async function updateAlertRuleController(
  request: FastifyRequest<{ Params: AlertRuleParams; Body: UpdateAlertRuleBody }>,
  reply: FastifyReply
) {
  const rule = await container.alertRuleService.update(
    request.organization.id,
    request.params.id,
    request.body
  )

  return reply.send({ rule })
}

export async function deleteAlertRuleController(
  request: FastifyRequest<{ Params: AlertRuleParams }>,
  reply: FastifyReply
) {
  await container.alertRuleService.delete(request.organization.id, request.params.id)
  return reply.status(StatusCodes.NO_CONTENT).send()
}

export async function evaluateAlertRulesController(
  request: FastifyRequest<{ Params: OrgParams; Body: EvaluateAlertRulesBody }>,
  reply: FastifyReply
) {
  const mode = request.body?.mode ?? 'all'
  const result = await container.alertRuleService.evaluateOrganization(
    request.organization.id,
    mode,
    { skipTimeCheck: true }
  )

  return reply.send({ ...result, mode })
}

export async function listManualAlertTargetsController(
  request: FastifyRequest<{ Params: OrgParams }>,
  reply: FastifyReply
) {
  const targets = await container.alertRuleService.listManualAlertTargets(request.organization.id)
  return reply.send({ targets })
}

export async function sendManualAlertController(
  request: FastifyRequest<{ Params: OrgParams; Body: SendManualAlertBody }>,
  reply: FastifyReply
) {
  const { targetKey, userId, type } = request.body
  const organizationId = request.organization.id
  const resolvedTargetKey =
    targetKey ?? (userId ? `user:${userId}` : null)

  if (!resolvedTargetKey) {
    return reply.status(StatusCodes.BAD_REQUEST).send({
      error: 'Bad Request',
      message: 'Either targetKey or userId is required',
    })
  }

  if (type === 'monthly-summary') {
    if (!resolvedTargetKey.startsWith('user:')) {
      return reply.status(StatusCodes.BAD_REQUEST).send({
        error: 'Bad Request',
        message: 'Relatório completo disponível apenas para membros',
      })
    }

    const memberUserId = resolvedTargetKey.slice('user:'.length)
    await container.alertRuleService.verifyOrganizationMember(organizationId, memberUserId)

    const userRow = await db.query.users.findFirst({ where: eq(users.id, memberUserId) })
    const phone = normalizePhone(userRow?.phone)

    if (!phone) {
      return reply.status(StatusCodes.BAD_REQUEST).send({
        error: 'Bad Request',
        message: 'Telefone do usuário vazio',
      })
    }

    try {
      const { formatReport } = await import('@/domain/ai/report-formatter')

      const message = await formatReport(
        'monthly-summary',
        await container.reportService.buildMonthlySummaryData(
          organizationId,
          memberUserId,
          userRow?.name ?? undefined
        )
      )

      const result = await sendWhatsAppMessage({ phone, message })

      if (result.status === 'error') {
        return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
          error: 'WhatsAppError',
          message: result.error,
        })
      }

      return reply.send({ sent: 1, errors: 0, type })
    } catch (error) {
      logger.error({ error }, 'Erro ao enviar resumo mensal por WhatsApp')
      return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
        error: 'Internal Server Error',
        message: 'Falha ao enviar resumo mensal',
      })
    }
  }

  if (resolvedTargetKey.startsWith('contact:')) {
    const result = await container.alertRuleService.sendManualContactAlerts(
      organizationId,
      resolvedTargetKey,
      type
    )

    return reply.send(result)
  }

  if (!resolvedTargetKey.startsWith('user:')) {
    return reply.status(StatusCodes.BAD_REQUEST).send({
      error: 'Bad Request',
      message: 'Invalid alert target',
    })
  }

  const result = await container.alertRuleService.sendManualMemberAlerts(
    organizationId,
    resolvedTargetKey.slice('user:'.length),
    type
  )

  return reply.send(result)
}
