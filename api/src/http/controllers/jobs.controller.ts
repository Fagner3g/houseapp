import { eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest, RouteHandler } from 'fastify'

import { db } from '@/db'
import { users } from '@/db/schemas/users'
import { getTransactionReports } from '@/domain/reports/dashboard'
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
} from '@/jobs'
import { logger } from '@/lib/logger'

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
 * Preview das transações que seriam processadas pelo job de alertas
 */
export async function previewTransactionAlertsController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Usar a função de preview que não envia mensagens
    const { previewTransactionAlerts } = await import('@/jobs/transaction-alerts')
    const userId = (request.query as { userId?: string } | undefined)?.userId
    const previewData = await previewTransactionAlerts(userId)

    return reply.status(200).send({
      preview: previewData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao fazer preview dos alertas de transação')
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to preview transaction alerts',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * Relatórios completos para o dashboard
 */
export async function getTransactionReportsController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // userId do solicitante é necessário para montar seus relatórios de dashboard
    const { sub: userId } = request.user as { sub: string }
    const { id: orgId } = request.organization
    
    // Parâmetros opcionais de ano/mês para visualizar dados históricos
    const { year, month } = request.query as { year?: string; month?: string }
    let referenceDate: Date | undefined
    
    if (year && month) {
      const yearNum = Number.parseInt(year, 10)
      const monthNum = Number.parseInt(month, 10) - 1 // Mês em JS é 0-indexed
      
      if (!Number.isNaN(yearNum) && !Number.isNaN(monthNum) && monthNum >= 0 && monthNum <= 11) {
        referenceDate = new Date(yearNum, monthNum, 15) // 15 do mês para evitar problemas de timezone
      }
    }

    const reports = await getTransactionReports(orgId, userId, referenceDate)

    // O serviço já retorna no formato { reports: { ... }, timestamp }
    return reply.status(200).send(reports)
  } catch (err) {
    logger.error({ err }, 'Failed to get transaction reports')
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to get transaction reports',
      timestamp: new Date().toISOString(),
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
    // Não precisamos do userId do solicitante para o resumo direcionado; usaremos o alvo
    const { id: orgId } = request.organization
    const { userId: targetUserId } = request.body

    // Buscar relatórios do mês atual para o usuário selecionado
    const reports = await getTransactionReports(orgId, targetUserId)

    // Buscar telefone e nome do usuário alvo
    const userRow = await db.query.users.findFirst({ where: eq(users.id, targetUserId) })
    const phone = normalizePhone(userRow?.phone)

    if (!phone) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Telefone do usuário vazio' })
    }

    // Montar mensagem de resumo com KPIs e principais categorias
    const k = reports.reports.kpis
    const formatBRL = (value?: number): string => {
      if (typeof value !== 'number') return '—'
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    }

    const now = new Date()
    const headerMonth = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    const lines: string[] = []
    lines.push(`📊 Resumo de ${headerMonth}`)
    lines.push('')

    const receitasPagas = k?.receivedTotal ?? 0
    const receitasAReceber = k?.toReceiveTotal ?? 0
    const receitasRegistradas = k?.incomeRegistered ?? 0
    const despesasRegistradas = k?.expenseRegistered ?? 0
    const despesasEmAberto = k?.toSpendTotal ?? 0
    const saldoMes = receitasRegistradas - despesasRegistradas

    lines.push(
      `• Receitas: ${formatBRL(receitasRegistradas)} (pagas ${formatBRL(
        receitasPagas
      )} | em aberto ${formatBRL(receitasAReceber)})`
    )
    lines.push(
      `• Despesas: ${formatBRL(despesasRegistradas)} (em aberto ${formatBRL(despesasEmAberto)})`
    )
    lines.push(`• Saldo do mês (Receitas − Despesas): ${formatBRL(saldoMes)}`)

    const message = lines.join('\n')
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

/**
 * Preview dos alertas de transações vencidas
 */
export async function previewOverdueAlertsController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { previewOverdueAlerts } = await import('@/jobs/overdue-alerts')
    const userId = (request.query as { userId?: string } | undefined)?.userId
    const preview = await previewOverdueAlerts(userId)

    return reply.status(200).send({
      preview,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao obter preview dos alertas vencidas')
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to get overdue alerts preview',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
  }
}
