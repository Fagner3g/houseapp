import { container } from '@/core/container'
import { logger } from '@/lib/logger'

import { sendWhatsappForNotifications } from '@/modules/alerts/send-whatsapp-notifications'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'

async function sendWhatsappAlerts(): Promise<JobResult> {
  const startTime = Date.now()

  try {
    const pending = await container.notificationRepository.findPendingByChannel('whatsapp', 200)
    const { sent: processed, errors } = await sendWhatsappForNotifications(
      container.notificationRepository,
      pending
    )

    return {
      success: errors === 0,
      processed,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    logger.error(error, 'Failed to process WhatsApp alerts')
    return {
      success: false,
      processed: 0,
      errors: 1,
      duration: Date.now() - startTime,
    }
  }
}

jobManager.registerJob(JOB_CONFIGS.SEND_WHATSAPP_ALERTS, sendWhatsappAlerts)

export async function runSendWhatsappAlertsNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.SEND_WHATSAPP_ALERTS.key)
}
