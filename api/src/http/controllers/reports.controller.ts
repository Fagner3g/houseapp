import type { FastifyReply, FastifyRequest } from 'fastify'

import { getTransactionReports } from '@/domain/reports/dashboard'
import { logger } from '@/lib/logger'

/**
 * Relatórios completos para o dashboard.
 */
export async function getTransactionReportsController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { sub: userId } = request.user as { sub: string }
    const { id: orgId } = request.organization

    const { year, month } = request.query as { year?: string; month?: string }
    let referenceDate: Date | undefined

    if (year && month) {
      const yearNum = Number.parseInt(year, 10)
      const monthNum = Number.parseInt(month, 10) - 1

      if (!Number.isNaN(yearNum) && !Number.isNaN(monthNum) && monthNum >= 0 && monthNum <= 11) {
        // Use the middle of the month to avoid month rollover due to timezone offsets.
        referenceDate = new Date(yearNum, monthNum, 15)
      }
    }

    const reports = await getTransactionReports(orgId, userId, referenceDate)
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
