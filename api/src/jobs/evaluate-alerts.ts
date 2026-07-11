import { logger } from '@/lib/logger'
import { container } from '@/core/container'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'
import { runSendWhatsappAlertsNow } from './send-whatsapp-alerts'

async function evaluateAlerts(): Promise<JobResult> {
  const startTime = Date.now()

  try {
    const result = await container.alertRuleService.evaluateAll()

    if (result.processed > 0 || result.errors > 0) {
      logger.info(
        {
          processed: result.processed,
          errors: result.errors,
        },
        'Alert rules evaluated'
      )
    }

    if (result.processed > 0) {
      const whatsappResult = await runSendWhatsappAlertsNow()
      if (whatsappResult && (whatsappResult.processed > 0 || whatsappResult.errors > 0)) {
        logger.info(
          {
            sent: whatsappResult.processed,
            errors: whatsappResult.errors,
          },
          'WhatsApp alerts sent after evaluation'
        )
      }
    }

    return {
      success: result.errors === 0,
      processed: result.processed,
      errors: result.errors,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    logger.error(error, 'Failed to evaluate alert rules')
    return {
      success: false,
      processed: 0,
      errors: 1,
      duration: Date.now() - startTime,
    }
  }
}

jobManager.registerJob(JOB_CONFIGS.EVALUATE_ALERTS, evaluateAlerts)

export async function runEvaluateAlertsNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.EVALUATE_ALERTS.key)
}

export async function previewEvaluateAlerts(orgId?: string) {
  const rules = orgId
    ? await container.alertRuleService.list(orgId)
    : []

  return {
    rules,
    notificationsCreated: 0,
  }
}
