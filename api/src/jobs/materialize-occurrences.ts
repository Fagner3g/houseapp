import { logger } from '@/lib/logger'
import { container } from '@/core/container'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'

async function ensureOccurrences(): Promise<JobResult> {
  const startTime = Date.now()

  try {
    const result = await container.recurringService.materializeOccurrences()

    logger.info(
      {
        processed: result.processed,
        generated: result.generated,
        errors: result.errors,
      },
      'Recurring transactions materialized'
    )

    return {
      success: result.errors === 0,
      processed: result.processed,
      errors: result.errors,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    logger.error(error, 'Failed to materialize recurring transactions')
    return {
      success: false,
      processed: 0,
      errors: 1,
      duration: Date.now() - startTime,
    }
  }
}

jobManager.registerJob(JOB_CONFIGS.MATERIALIZE_OCCURRENCES, ensureOccurrences)

export async function runMaterializeNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.MATERIALIZE_OCCURRENCES.key)
}
