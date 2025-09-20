import type { FastifyReply, FastifyRequest } from 'fastify'

import { logger } from '@/http/utils/logger'
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
} from '@/jobs'
import { getTransactionReports, previewTransactionAlerts } from '@/jobs/transaction-alerts'

/**
 * Lista o status de todos os jobs
 */
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
    const result = await runJobNow(jobKey)

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
 * Preview das transações que seriam processadas pelo job de alertas
 */
export async function previewTransactionAlertsController(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const preview = await previewTransactionAlerts()

    return reply.status(200).send({
      preview,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao fazer preview dos alertas de transação')
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to preview transaction alerts',
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * Relatórios completos para o dashboard
 */
export async function getTransactionReportsController(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const reports = await getTransactionReports()

    return reply.status(200).send({
      reports,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao obter relatórios de transação')
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to get transaction reports',
      timestamp: new Date().toISOString(),
    })
  }
}
