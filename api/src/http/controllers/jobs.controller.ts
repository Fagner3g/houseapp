import { eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest, RouteHandler } from 'fastify'

import { container } from '@/core/container'
import { db } from '@/db'
import { users } from '@/db/schemas/users'
import { normalizePhone, sendWhatsAppMessage } from '@/domain/whatsapp'
import {
  getJobInfo,
  getJobsStatus,
  getSystemStats,
  jobExists,
  runJobNow,
  startAllJobs,
  startJob,
  stopAllJobs,
  stopJob,
  getExecutionHistory,
  getLastExecution,
  computeNextRun,
  humanizeSchedule,
  JOB_CONFIGS,
} from '@/jobs'
import { logger } from '@/lib/logger'
import { areSystemNotificationsEnabled } from '@/modules/system-settings/notifications-enabled'

export async function listJobsController(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const jobs = getJobsStatus()

    return reply.status(200).send({
      jobs,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao listar jobs')
    return reply.status(500).send({
      error: 'Erro interno do servidor',
      message: 'Não foi possível listar os jobs',
    })
  }
}

/**
 * Executa um job específico manualmente
 */
export async function runJobController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { jobKey } = request.params as { jobKey: string }

    if (!jobExists(jobKey)) {
      return reply.status(404).send({
        error: 'Job não encontrado',
        message: `Job '${jobKey}' não existe`,
      })
    }

    logger.info({ jobKey }, '🚀 Executando job manualmente via API')
    // Permitir userId opcional para jobs de alertas
    const { userId } = (request.body as { userId?: string }) || {}
    const result = await runJobNow(jobKey, userId)

    if (!result) {
      return reply.status(500).send({
        error: 'Erro na execução',
        message: 'Não foi possível executar o job',
      })
    }

    return reply.status(200).send({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao executar job')
    return reply.status(500).send({
      error: 'Erro interno do servidor',
      message: 'Não foi possível executar o job',
    })
  }
}

/**
 * Retorna informações detalhadas de um job específico
 */
export async function getJobController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { jobKey } = request.params as { jobKey: string }

    const jobInfo = getJobInfo(jobKey)

    if (!jobInfo) {
      return reply.status(404).send({
        error: 'Job não encontrado',
        message: `Job '${jobKey}' não existe`,
      })
    }

    return reply.status(200).send({
      job: jobInfo,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao obter informações do job')
    return reply.status(500).send({
      error: 'Erro interno do servidor',
      message: 'Não foi possível obter informações do job',
    })
  }
}

/**
 * Retorna estatísticas do sistema de jobs
 */
export async function getJobsStatsController(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const stats = getSystemStats()

    return reply.status(200).send({
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao obter estatísticas dos jobs')
    return reply.status(500).send({
      error: 'Erro interno do servidor',
      message: 'Não foi possível obter estatísticas dos jobs',
    })
  }
}

/**
 * Para todos os jobs (apenas para administradores)
 */
export async function stopAllJobsController(_request: FastifyRequest, reply: FastifyReply) {
  try {
    logger.warn('🛑 Parando todos os jobs via API')
    stopAllJobs()

    return reply.status(200).send({
      success: true,
      message: 'Todos os jobs foram parados',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao parar jobs')
    return reply.status(500).send({
      error: 'Erro interno do servidor',
      message: 'Não foi possível parar os jobs',
    })
  }
}

/**
 * Para um job específico
 */
export async function stopJobController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { jobKey } = request.params as { jobKey: string }

    if (!jobExists(jobKey)) {
      return reply.status(404).send({
        error: 'Job não encontrado',
        message: `Job '${jobKey}' não existe`,
      })
    }

    logger.info({ jobKey }, '⏹️ Parando job via API')
    stopJob(jobKey)

    return reply.status(200).send({
      success: true,
      message: `Job '${jobKey}' foi parado`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao parar job')
    return reply.status(500).send({
      error: 'Erro interno do servidor',
      message: 'Não foi possível parar o job',
    })
  }
}

/**
 * Inicia um job específico
 */
export async function startJobController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { jobKey } = request.params as { jobKey: string }

    if (!jobExists(jobKey)) {
      return reply.status(404).send({
        error: 'Job não encontrado',
        message: `Job '${jobKey}' não existe`,
      })
    }

    logger.info({ jobKey }, '▶️ Iniciando job via API')
    startJob(jobKey)

    return reply.status(200).send({
      success: true,
      message: `Job '${jobKey}' foi iniciado`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao iniciar job')
    return reply.status(500).send({
      error: 'Erro interno do servidor',
      message: 'Não foi possível iniciar o job',
    })
  }
}

/**
 * Inicia todos os jobs (apenas os que estão parados)
 */
export async function startAllJobsController(_request: FastifyRequest, reply: FastifyReply) {
  try {
    logger.info('🚀 Iniciando todos os jobs via API')
    startAllJobs()

    return reply.status(200).send({
      success: true,
      message: 'Todos os jobs foram iniciados',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao iniciar jobs')
    return reply.status(500).send({
      error: 'Erro interno do servidor',
      message: 'Não foi possível iniciar os jobs',
    })
  }
}

/**
 * Envia resumo mensal completo via WhatsApp para um usuário específico
 */
type SendMonthlySummaryRoute = {
  Params: { slug: string }
  Body: { userId: string }
}

export const sendMonthlySummaryController: RouteHandler<SendMonthlySummaryRoute> = async (
  request,
  reply
) => {
  try {
    if (!(await areSystemNotificationsEnabled())) {
      return reply
        .status(503)
        .send({ error: 'NotificationsDisabled', message: 'Notificações do sistema estão desativadas' })
    }

    // Não precisamos do userId do solicitante para o resumo direcionado; usaremos o alvo
    const { id: orgId } = request.organization
    const { userId: targetUserId } = request.body

    const userRow = await db.query.users.findFirst({ where: eq(users.id, targetUserId) })
    const phone = normalizePhone(userRow?.phone)

    if (!phone) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Telefone do usuário vazio' })
    }

    const { formatReport } = await import('@/domain/ai/report-formatter')

    const message = await formatReport(
      'monthly-summary',
      await container.reportService.buildMonthlySummaryData(orgId, targetUserId, userRow?.name ?? undefined)
    )

    const result = await sendWhatsAppMessage({ phone, message })

    if (result.status === 'error') {
      return reply.status(500).send({ error: 'WhatsAppError', message: result.error })
    }

    return reply.status(200).send({ success: true, phone: result.phone })
  } catch (error) {
    logger.error({ error }, 'Erro ao enviar resumo mensal por WhatsApp')
    return reply
      .status(500)
      .send({ error: 'Internal Server Error', message: 'Falha ao enviar resumo mensal' })
  }
}

export async function getJobHistoryController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { jobKey } = request.params as { jobKey: string }

    if (!jobExists(jobKey)) {
      return reply.status(404).send({ error: 'Job não encontrado', message: `Job '${jobKey}' não existe` })
    }

    const history = getExecutionHistory(jobKey, 10)
    const lastRun = getLastExecution(jobKey)

    return reply.status(200).send({
      jobKey,
      lastRun: lastRun ? { ...lastRun, timestamp: lastRun.timestamp.toISOString() } : null,
      history: history.map(h => ({ ...h, timestamp: h.timestamp.toISOString() })),
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao obter histórico do job')
    return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to get job history' })
  }
}

export async function getJobNextRunController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { jobKey } = request.params as { jobKey: string }

    if (!jobExists(jobKey)) {
      return reply.status(404).send({ error: 'Job não encontrado', message: `Job '${jobKey}' não existe` })
    }

    const config = Object.values(JOB_CONFIGS).find(c => c.key === jobKey)
    const nextRun = config ? computeNextRun(config.schedule, config.timezone) : 'Indisponível'
    const scheduleHuman = config ? humanizeSchedule(config.schedule) : jobKey

    return reply.status(200).send({
      jobKey,
      nextRun,
      schedule: config?.schedule ?? '',
      scheduleHuman,
      timezone: config?.timezone ?? '',
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao obter próxima execução')
    return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to get next run' })
  }
}
