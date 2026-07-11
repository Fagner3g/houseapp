import { client } from '@/db'
import { container } from '@/core/container'
import { logger } from '@/lib/logger'

import { sendWhatsappForNotifications } from '@/modules/alerts/send-whatsapp-notifications'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'

const WHATSAPP_ALERTS_LOCK_KEY = 8_472_612_3

async function runWithWhatsAppSendLock(
  fn: () => Promise<JobResult>
): Promise<JobResult | null> {
  // Session advisory locks must use one reserved connection — pool reuse
  // would unlock on a different session and leave the lock stuck forever.
  const reserved = await client.reserve()

  try {
    const [lockRow] = await reserved<{ locked: boolean }[]>`
      SELECT pg_try_advisory_lock(${WHATSAPP_ALERTS_LOCK_KEY}) AS locked
    `

    if (!lockRow?.locked) {
      return null
    }

    try {
      return await fn()
    } finally {
      await reserved`SELECT pg_advisory_unlock(${WHATSAPP_ALERTS_LOCK_KEY})`
    }
  } finally {
    reserved.release()
  }
}

async function sendWhatsappAlerts(): Promise<JobResult> {
  const startTime = Date.now()

  const lockedResult = await runWithWhatsAppSendLock(async () => {
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
  })

  if (lockedResult) {
    return lockedResult
  }

  return {
    success: true,
    processed: 0,
    errors: 0,
    duration: Date.now() - startTime,
  }
}

jobManager.registerJob(JOB_CONFIGS.SEND_WHATSAPP_ALERTS, sendWhatsappAlerts)

export async function runSendWhatsappAlertsNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.SEND_WHATSAPP_ALERTS.key)
}
